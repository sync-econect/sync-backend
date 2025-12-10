import { IsString, IsObject, IsOptional, IsIn } from 'class-validator';

export class UpdateRawDataDto {
  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @IsString()
  competency?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @IsOptional()
  @IsIn(['RECEIVED', 'PROCESSING', 'PROCESSED', 'ERROR'])
  status?: string;
}
