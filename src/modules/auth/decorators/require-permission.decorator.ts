import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';

export interface PermissionRequirement {
  action: 'view' | 'create' | 'edit' | 'delete' | 'transmit';
  /**
   * Se deve extrair unitId do request (body, params ou query)
   * Ex: 'body.unitId', 'params.id', 'query.unitId'
   */
  unitIdPath?: string;
  /**
   * Se deve extrair module do request (body, params ou query)
   * Ex: 'body.module', 'params.module', 'query.module'
   */
  modulePath?: string;
  /**
   * Módulo fixo para verificação
   */
  module?: string;
}

/**
 * Decorator que exige uma permissão específica para acessar o endpoint
 *
 * @example
 * // Exige permissão de criar no módulo CONTRATO
 * @RequirePermission({ action: 'create', module: 'CONTRATO' })
 *
 * @example
 * // Exige permissão de editar, extraindo unitId do body
 * @RequirePermission({ action: 'edit', unitIdPath: 'body.unitId', modulePath: 'body.module' })
 *
 * @example
 * // Exige permissão de transmitir, extraindo unitId dos params
 * @RequirePermission({ action: 'transmit', unitIdPath: 'params.unitId' })
 */
export const RequirePermission = (requirement: PermissionRequirement) =>
  SetMetadata(PERMISSION_KEY, requirement);

