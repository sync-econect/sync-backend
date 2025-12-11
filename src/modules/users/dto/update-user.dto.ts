import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { UserRole } from './create-user.dto';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'Nome inválido' })
  @MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Senha inválida' })
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  password?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Role inválida' })
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
