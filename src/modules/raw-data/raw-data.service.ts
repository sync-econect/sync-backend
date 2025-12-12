import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { UserPermissionsService } from '../user-permissions/user-permissions.service';
import { CreateRawDataDto, UpdateRawDataDto } from './dto';
import { RawData, Prisma } from '../../../generated/prisma/client';

@Injectable()
export class RawDataService {
  constructor(
    private prisma: PrismaService,
    private userPermissionsService: UserPermissionsService,
  ) {}

  async create(createRawDataDto: CreateRawDataDto): Promise<RawData> {
    return this.prisma.client.rawData.create({
      data: {
        unitId: createRawDataDto.unitId,
        module: createRawDataDto.module,
        competency: createRawDataDto.competency,
        payload: createRawDataDto.payload as Prisma.InputJsonValue,
        status: 'RECEIVED',
      },
      include: {
        unit: true,
      },
    });
  }

  async findAll(
    filters?: {
      unitId?: number;
      module?: string;
      status?: string;
      competency?: string;
    },
    userId?: number,
  ): Promise<RawData[]> {
    // Filtra por UGs permitidas para o usuário
    let unitFilter: Prisma.RawDataWhereInput = {};
    if (userId) {
      const permittedUnits =
        await this.userPermissionsService.getPermittedUnits(userId, 'view');
      if (permittedUnits !== 'all') {
        unitFilter = { unitId: { in: permittedUnits } };
      }
    }

    return this.prisma.client.rawData.findMany({
      where: {
        ...(filters?.unitId && { unitId: filters.unitId }),
        ...(filters?.module && { module: filters.module }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.competency && { competency: filters.competency }),
        ...unitFilter,
      },
      include: {
        unit: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number): Promise<RawData> {
    const rawData = await this.prisma.client.rawData.findUnique({
      where: { id },
      include: {
        unit: true,
        validations: true,
        transformedData: true,
      },
    });

    if (!rawData) {
      throw new NotFoundException(`RawData com ID ${id} não encontrado`);
    }

    return rawData;
  }

  async update(
    id: number,
    updateRawDataDto: UpdateRawDataDto,
    userId?: number,
  ): Promise<RawData> {
    const rawData = await this.findOne(id);

    // Verifica permissão granular
    if (userId) {
      await this.checkPermission(userId, rawData.unitId, rawData.module, 'edit');
    }

    const updateData: Prisma.RawDataUpdateInput = {
      ...(updateRawDataDto.module && { module: updateRawDataDto.module }),
      ...(updateRawDataDto.competency && {
        competency: updateRawDataDto.competency,
      }),
      ...(updateRawDataDto.status && { status: updateRawDataDto.status }),
      ...(updateRawDataDto.payload && {
        payload: updateRawDataDto.payload as Prisma.InputJsonValue,
      }),
    };

    return this.prisma.client.rawData.update({
      where: { id },
      data: updateData,
      include: {
        unit: true,
      },
    });
  }

  async remove(id: number, userId?: number): Promise<RawData> {
    const rawData = await this.findOne(id);

    // Verifica permissão granular
    if (userId) {
      await this.checkPermission(
        userId,
        rawData.unitId,
        rawData.module,
        'delete',
      );
    }

    return this.prisma.client.rawData.delete({
      where: { id },
    });
  }

  async findByModule(module: string, userId?: number): Promise<RawData[]> {
    // Filtra por UGs permitidas para o usuário
    let unitFilter: Prisma.RawDataWhereInput = {};
    if (userId) {
      const permittedUnits =
        await this.userPermissionsService.getPermittedUnits(userId, 'view');
      if (permittedUnits !== 'all') {
        unitFilter = { unitId: { in: permittedUnits } };
      }
    }

    return this.prisma.client.rawData.findMany({
      where: { module, ...unitFilter },
      include: {
        unit: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateStatus(id: number, status: string): Promise<RawData> {
    await this.findOne(id);

    return this.prisma.client.rawData.update({
      where: { id },
      data: { status },
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
        delete: 'excluir',
        transmit: 'transmitir',
      };
      throw new ForbiddenException(
        `Você não tem permissão para ${actionLabels[action]} dados desta UG/módulo`,
      );
    }
  }
}
