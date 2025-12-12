import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Remittance, Prisma } from '../../../generated/prisma/client';
import { ValidationsService } from '../validations/validations.service';
import { TransformService } from '../transform/transform.service';
import { UserPermissionsService } from '../user-permissions/user-permissions.service';
import { CreateRemittanceDto } from './dto';

export interface RemittanceStats {
  total: number;
  byStatus: Record<string, number>;
  byModule: Record<string, number>;
}

export interface RemittanceFilters {
  status?: string;
  module?: string;
  competency?: string;
  unitId?: number;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class RemittancesService {
  constructor(
    private prisma: PrismaService,
    private validationsService: ValidationsService,
    private transformService: TransformService,
    private userPermissionsService: UserPermissionsService,
  ) {}

  async create(
    createRemittanceDto: CreateRemittanceDto,
    userId?: number,
  ): Promise<Remittance> {
    const { rawDataId } = createRemittanceDto;

    const rawData = await this.prisma.client.rawData.findUnique({
      where: { id: rawDataId },
    });

    if (!rawData) {
      throw new NotFoundException(`RawData com ID ${rawDataId} não encontrado`);
    }

    // Verifica permissão granular por UG e módulo
    if (userId) {
      await this.checkPermission(
        userId,
        rawData.unitId,
        rawData.module,
        'create',
      );
    }

    await this.prisma.client.remittance
      .update({
        where: { id: rawDataId },
        data: { status: 'VALIDATING' },
      })
      .catch(() => {});

    const validationResult =
      await this.validationsService.validateRawData(rawDataId);

    if (validationResult.hasBlockingErrors) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        message: 'Dados não passaram na validação',
        errors: validationResult.validations.filter(
          (v) => v.level === 'IMPEDITIVA',
        ),
      });
    }

    const transformResult =
      await this.transformService.transformToEsfinge(rawDataId);

    const remittance = await this.prisma.client.remittance.create({
      data: {
        unitId: rawData.unitId,
        module: rawData.module,
        competency: rawData.competency,
        status: 'READY',
        payload: transformResult.result.payload as Prisma.InputJsonValue,
      },
    });

    return remittance;
  }

  async findAll(
    filters?: RemittanceFilters,
    userId?: number,
  ): Promise<{
    data: Remittance[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 10;
    const skip = (page - 1) * limit;

    const dateFilter: Prisma.RemittanceWhereInput = {};
    if (filters?.from || filters?.to) {
      dateFilter.createdAt = {
        ...(filters.from && { gte: new Date(filters.from) }),
        ...(filters.to && { lte: new Date(filters.to) }),
      };
    }

    // Filtra por UGs permitidas para o usuário
    let unitFilter: Prisma.RemittanceWhereInput = {};
    if (userId) {
      const permittedUnits =
        await this.userPermissionsService.getPermittedUnits(userId, 'view');
      if (permittedUnits !== 'all') {
        unitFilter = { unitId: { in: permittedUnits } };
      }
    }

    const where: Prisma.RemittanceWhereInput = {
      ...(filters?.status && { status: filters.status }),
      ...(filters?.module && { module: filters.module }),
      ...(filters?.competency && { competency: filters.competency }),
      ...(filters?.unitId && { unitId: filters.unitId }),
      ...dateFilter,
      ...unitFilter,
    };

    const [data, total] = await Promise.all([
      this.prisma.client.remittance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { unit: true },
      }),
      this.prisma.client.remittance.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: number): Promise<Remittance> {
    const remittance = await this.prisma.client.remittance.findUnique({
      where: { id },
      include: { unit: true, remittanceLogs: true },
    });

    if (!remittance) {
      throw new NotFoundException(`Remittance com ID ${id} não encontrada`);
    }

    return remittance;
  }

  async cancel(id: number, userId?: number): Promise<Remittance> {
    const remittance = await this.findOne(id);

    // Verifica permissão granular
    if (userId) {
      await this.checkPermission(
        userId,
        remittance.unitId,
        remittance.module,
        'delete',
      );
    }

    if (['SENT', 'CANCELLED'].includes(remittance.status)) {
      throw new BadRequestException(
        `Não é possível cancelar remessa com status ${remittance.status}`,
      );
    }

    return this.prisma.client.remittance.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async retry(id: number, userId?: number): Promise<Remittance> {
    const remittance = await this.findOne(id);

    // Verifica permissão granular
    if (userId) {
      await this.checkPermission(
        userId,
        remittance.unitId,
        remittance.module,
        'transmit',
      );
    }

    if (remittance.status !== 'ERROR') {
      throw new BadRequestException(
        'Apenas remessas com erro podem ser reenviadas',
      );
    }

    return this.prisma.client.remittance.update({
      where: { id },
      data: {
        status: 'READY',
        errorMsg: null,
      },
    });
  }

  async getStats(): Promise<RemittanceStats> {
    const remittances = await this.prisma.client.remittance.findMany({
      select: { status: true, module: true },
    });

    const byStatus: Record<string, number> = {};
    const byModule: Record<string, number> = {};

    for (const r of remittances) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      byModule[r.module] = (byModule[r.module] ?? 0) + 1;
    }

    return {
      total: remittances.length,
      byStatus,
      byModule,
    };
  }

  async getLogs(id: number) {
    const remittance = await this.findOne(id);

    return this.prisma.client.remittanceLog.findMany({
      where: { remittanceId: remittance.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async checkPermission(
    userId: number,
    unitId: number,
    module: string,
    action: 'view' | 'create' | 'edit' | 'delete' | 'transmit',
  ): Promise<void> {
    const hasPermission = await this.userPermissionsService.checkPermission({
      userId,
      unitId,
      module,
      action,
    });

    if (!hasPermission) {
      const actionLabels: Record<string, string> = {
        view: 'visualizar',
        create: 'criar',
        edit: 'editar',
        delete: 'cancelar',
        transmit: 'transmitir',
      };
      throw new ForbiddenException(
        `Você não tem permissão para ${actionLabels[action]} remessas desta UG/módulo`,
      );
    }
  }
}
