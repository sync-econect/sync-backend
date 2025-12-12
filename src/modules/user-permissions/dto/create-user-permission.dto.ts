import {
  IsInt,
  IsOptional,
  IsString,
  IsBoolean,
  IsIn,
} from 'class-validator';

export const MODULES = [
  'CONTRATO',
  'COMPRA_DIRETA',
  'EMPENHO',
  'LIQUIDACAO',
  'PAGAMENTO',
  'EXECUCAO_ORCAMENTARIA',
  'CONVENIO',
  'LICITACAO',
  'PPA',
  'LDO',
  'LOA',
  'ALTERACAO_ORCAMENTARIA',
] as const;

export type ModuleType = (typeof MODULES)[number];

export class CreateUserPermissionDto {
  @IsInt()
  userId!: number;

  @IsOptional()
  @IsInt()
  unitId?: number | null;

  @IsOptional()
  @IsString()
  @IsIn([...MODULES, null])
  module?: string | null;

  @IsOptional()
  @IsBoolean()
  canView?: boolean;

  @IsOptional()
  @IsBoolean()
  canCreate?: boolean;

  @IsOptional()
  @IsBoolean()
  canEdit?: boolean;

  @IsOptional()
  @IsBoolean()
  canDelete?: boolean;

  @IsOptional()
  @IsBoolean()
  canTransmit?: boolean;
}

