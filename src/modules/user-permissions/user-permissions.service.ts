import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { UserPermission } from '../../../generated/prisma/client';
import { CreateUserPermissionDto, UpdateUserPermissionDto } from './dto';

export type PermissionAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'transmit';

export interface CheckPermissionParams {
  userId: number;
  unitId?: number | null;
  module?: string | null;
  action: PermissionAction;
}

@Injectable()
export class UserPermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createDto: CreateUserPermissionDto,
  ): Promise<UserPermission> {
    // Verifica se o usuário existe
    const user = await this.prisma.client.user.findUnique({
      where: { id: createDto.userId },
    });

    if (!user) {
      throw new NotFoundException(
        `Usuário com ID ${createDto.userId} não encontrado`,
      );
    }

    // Verifica se a UG existe (se informada)
    if (createDto.unitId) {
      const unit = await this.prisma.client.unit.findUnique({
        where: { id: createDto.unitId },
      });

      if (!unit) {
        throw new NotFoundException(
          `Unidade com ID ${createDto.unitId} não encontrada`,
        );
      }
    }

    // Verifica se já existe uma permissão com a mesma combinação
    const existing = await this.prisma.client.userPermission.findFirst({
      where: {
        userId: createDto.userId,
        unitId: createDto.unitId ?? null,
        module: createDto.module ?? null,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Já existe uma permissão com esta combinação de usuário, unidade e módulo',
      );
    }

    return this.prisma.client.userPermission.create({
      data: {
        userId: createDto.userId,
        unitId: createDto.unitId ?? null,
        module: createDto.module ?? null,
        canView: createDto.canView ?? false,
        canCreate: createDto.canCreate ?? false,
        canEdit: createDto.canEdit ?? false,
        canDelete: createDto.canDelete ?? false,
        canTransmit: createDto.canTransmit ?? false,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        unit: {
          select: { id: true, code: true, name: true },
        },
      },
    });
  }

  async findAll(filters?: {
    userId?: number;
    unitId?: number;
    module?: string;
  }): Promise<UserPermission[]> {
    return this.prisma.client.userPermission.findMany({
      where: {
        ...(filters?.userId && { userId: filters.userId }),
        ...(filters?.unitId && { unitId: filters.unitId }),
        ...(filters?.module && { module: filters.module }),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        unit: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: [{ userId: 'asc' }, { unitId: 'asc' }, { module: 'asc' }],
    });
  }

  async findByUser(userId: number): Promise<UserPermission[]> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${userId} não encontrado`);
    }

    return this.prisma.client.userPermission.findMany({
      where: { userId },
      include: {
        unit: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: [{ unitId: 'asc' }, { module: 'asc' }],
    });
  }

  async findOne(id: number): Promise<UserPermission> {
    const permission = await this.prisma.client.userPermission.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        unit: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    if (!permission) {
      throw new NotFoundException(`Permissão com ID ${id} não encontrada`);
    }

    return permission;
  }

  async update(
    id: number,
    updateDto: UpdateUserPermissionDto,
  ): Promise<UserPermission> {
    await this.findOne(id);

    return this.prisma.client.userPermission.update({
      where: { id },
      data: {
        ...(updateDto.unitId !== undefined && { unitId: updateDto.unitId }),
        ...(updateDto.module !== undefined && { module: updateDto.module }),
        ...(updateDto.canView !== undefined && { canView: updateDto.canView }),
        ...(updateDto.canCreate !== undefined && {
          canCreate: updateDto.canCreate,
        }),
        ...(updateDto.canEdit !== undefined && { canEdit: updateDto.canEdit }),
        ...(updateDto.canDelete !== undefined && {
          canDelete: updateDto.canDelete,
        }),
        ...(updateDto.canTransmit !== undefined && {
          canTransmit: updateDto.canTransmit,
        }),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        unit: {
          select: { id: true, code: true, name: true },
        },
      },
    });
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.findOne(id);

    await this.prisma.client.userPermission.delete({
      where: { id },
    });

    return { message: 'Permissão removida com sucesso' };
  }

  /**
   * Verifica se um usuário tem permissão para realizar uma ação
   * Lógica de cascata:
   * 1. Permissão específica (UG + módulo) tem prioridade
   * 2. Permissão de módulo (qualquer UG) vem em seguida
   * 3. Permissão de UG (qualquer módulo) vem depois
   * 4. Permissão global (sem UG e sem módulo) é o fallback
   */
  async checkPermission(params: CheckPermissionParams): Promise<boolean> {
    const { userId, unitId, module, action } = params;

    // Busca o usuário com sua role
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { role: true, active: true },
    });

    if (!user || !user.active) {
      return false;
    }

    // ADMIN tem todas as permissões
    if (user.role === 'ADMIN') {
      return true;
    }

    // Busca todas as permissões do usuário
    const permissions = await this.prisma.client.userPermission.findMany({
      where: { userId },
    });

    // Se não há permissões, nega acesso (exceto para ADMIN que já foi tratado)
    if (permissions.length === 0) {
      return false;
    }

    // Mapeia a ação para o campo correspondente
    const actionField = this.getActionField(action);

    // Ordem de prioridade para verificação
    // 1. Permissão específica (UG + módulo)
    if (unitId && module) {
      const specificPermission = permissions.find(
        (p) => p.unitId === unitId && p.module === module,
      );
      if (specificPermission) {
        return specificPermission[actionField] === true;
      }
    }

    // 2. Permissão de módulo para qualquer UG (unitId = null)
    if (module) {
      const modulePermission = permissions.find(
        (p) => p.unitId === null && p.module === module,
      );
      if (modulePermission) {
        return modulePermission[actionField] === true;
      }
    }

    // 3. Permissão de UG para qualquer módulo (module = null)
    if (unitId) {
      const unitPermission = permissions.find(
        (p) => p.unitId === unitId && p.module === null,
      );
      if (unitPermission) {
        return unitPermission[actionField] === true;
      }
    }

    // 4. Permissão global (unitId = null e module = null)
    const globalPermission = permissions.find(
      (p) => p.unitId === null && p.module === null,
    );
    if (globalPermission) {
      return globalPermission[actionField] === true;
    }

    return false;
  }

  /**
   * Retorna todas as UGs que o usuário tem permissão para a ação especificada
   */
  async getPermittedUnits(
    userId: number,
    action: PermissionAction,
  ): Promise<number[] | 'all'> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // ADMIN tem acesso a todas as UGs
    if (user?.role === 'ADMIN') {
      return 'all';
    }

    const permissions = await this.prisma.client.userPermission.findMany({
      where: { userId },
    });

    const actionField = this.getActionField(action);

    // Verifica se tem permissão global
    const hasGlobalPermission = permissions.some(
      (p) => p.unitId === null && p[actionField] === true,
    );

    if (hasGlobalPermission) {
      return 'all';
    }

    // Retorna as UGs específicas onde tem permissão
    const permittedUnitIds = permissions
      .filter((p) => p.unitId !== null && p[actionField] === true)
      .map((p) => p.unitId as number);

    return [...new Set(permittedUnitIds)];
  }

  /**
   * Retorna todos os módulos que o usuário tem permissão para a ação especificada
   */
  async getPermittedModules(
    userId: number,
    action: PermissionAction,
    unitId?: number,
  ): Promise<string[] | 'all'> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // ADMIN tem acesso a todos os módulos
    if (user?.role === 'ADMIN') {
      return 'all';
    }

    const permissions = await this.prisma.client.userPermission.findMany({
      where: { userId },
    });

    const actionField = this.getActionField(action);

    // Verifica se tem permissão global
    const hasGlobalPermission = permissions.some(
      (p) =>
        p.unitId === null && p.module === null && p[actionField] === true,
    );

    if (hasGlobalPermission) {
      return 'all';
    }

    // Se unitId foi informado, verifica permissão de UG
    if (unitId) {
      const unitPermission = permissions.find(
        (p) => p.unitId === unitId && p.module === null && p[actionField],
      );
      if (unitPermission) {
        return 'all';
      }
    }

    // Retorna os módulos específicos onde tem permissão
    const permittedModules = permissions
      .filter((p) => {
        // Se unitId informado, filtra por UG também
        if (unitId && p.unitId !== null && p.unitId !== unitId) {
          return false;
        }
        return p.module !== null && p[actionField] === true;
      })
      .map((p) => p.module as string);

    return [...new Set(permittedModules)];
  }

  private getActionField(
    action: PermissionAction,
  ): 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'canTransmit' {
    const map: Record<
      PermissionAction,
      'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'canTransmit'
    > = {
      view: 'canView',
      create: 'canCreate',
      edit: 'canEdit',
      delete: 'canDelete',
      transmit: 'canTransmit',
    };
    return map[action];
  }

  /**
   * Cria permissões em lote para um usuário
   */
  async createBulk(
    userId: number,
    permissions: Omit<CreateUserPermissionDto, 'userId'>[],
  ): Promise<UserPermission[]> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${userId} não encontrado`);
    }

    const results: UserPermission[] = [];

    for (const perm of permissions) {
      try {
        const created = await this.create({
          ...perm,
          userId,
        });
        results.push(created);
      } catch (error) {
        // Ignora erros de duplicidade em bulk
        if (error instanceof ConflictException) {
          continue;
        }
        throw error;
      }
    }

    return results;
  }

  /**
   * Remove todas as permissões de um usuário
   */
  async removeAllByUser(userId: number): Promise<{ count: number }> {
    const result = await this.prisma.client.userPermission.deleteMany({
      where: { userId },
    });

    return { count: result.count };
  }
}

