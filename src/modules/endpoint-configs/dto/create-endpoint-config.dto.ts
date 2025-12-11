import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class CreateEndpointConfigDto {
  @IsString()
  module!: string;

  @IsString()
  endpoint!: string;

  @IsOptional()
  @IsIn(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
  method?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

