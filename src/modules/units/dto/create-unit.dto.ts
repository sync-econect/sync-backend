import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class CreateUnitDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  tokenProducao?: string;

  @IsOptional()
  @IsString()
  tokenHomologacao?: string;

  @IsOptional()
  @IsIn(['PRODUCAO', 'HOMOLOGACAO'])
  ambiente?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
