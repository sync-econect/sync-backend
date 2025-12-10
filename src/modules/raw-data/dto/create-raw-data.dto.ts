import { IsInt, IsString, IsObject } from 'class-validator';

export class CreateRawDataDto {
  @IsInt()
  unitId!: number;

  @IsString()
  module!: string;

  @IsString()
  competency!: string;

  @IsObject()
  payload!: Record<string, unknown>;
}
