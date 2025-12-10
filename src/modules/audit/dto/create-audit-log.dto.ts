import { IsInt, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateAuditLogDto {
  @IsString()
  action!: string;

  @IsString()
  entity!: string;

  @IsOptional()
  @IsInt()
  entityId?: number;

  @IsOptional()
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsObject()
  oldValue?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  newValue?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  ip?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}
