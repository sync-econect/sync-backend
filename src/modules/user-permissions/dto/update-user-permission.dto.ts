import { IsOptional, IsBoolean, IsString, IsInt, IsIn } from 'class-validator';
import { MODULES } from './create-user-permission.dto';

export class UpdateUserPermissionDto {
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

