import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSION_KEY,
  PermissionRequirement,
} from '../decorators/require-permission.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedUser } from '../auth.service';
import {
  UserPermissionsService,
  PermissionAction,
} from '../../user-permissions/user-permissions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userPermissionsService: UserPermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Verifica se é rota pública
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Busca o requirement de permissão
    const requirement = this.reflector.getAllAndOverride<PermissionRequirement>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Se não há requirement de permissão, permite (usa apenas RolesGuard)
    if (!requirement) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      body?: Record<string, unknown>;
      params?: Record<string, string>;
      query?: Record<string, string>;
    }>();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    // ADMIN tem todas as permissões
    if (user.role === 'ADMIN') {
      return true;
    }

    // Extrai unitId e module do request
    const unitId = this.extractValue(request, requirement.unitIdPath);
    const module =
      requirement.module ||
      this.extractValue(request, requirement.modulePath);

    // Verifica a permissão
    const hasPermission = await this.userPermissionsService.checkPermission({
      userId: user.id,
      unitId: unitId ? parseInt(String(unitId), 10) : undefined,
      module: module ? String(module) : undefined,
      action: requirement.action as PermissionAction,
    });

    if (!hasPermission) {
      throw new ForbiddenException(
        `Você não tem permissão para ${this.getActionLabel(requirement.action)}`,
      );
    }

    return true;
  }

  private extractValue(
    request: {
      body?: Record<string, unknown>;
      params?: Record<string, string>;
      query?: Record<string, string>;
    },
    path?: string,
  ): unknown {
    if (!path) {
      return undefined;
    }

    const parts = path.split('.');
    const source = parts[0] as 'body' | 'params' | 'query';
    const key = parts[1];

    if (!key) {
      return undefined;
    }

    const data = request[source];
    if (!data) {
      return undefined;
    }

    return data[key];
  }

  private getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      view: 'visualizar este recurso',
      create: 'criar este recurso',
      edit: 'editar este recurso',
      delete: 'excluir este recurso',
      transmit: 'transmitir este recurso',
    };
    return labels[action] || action;
  }
}

