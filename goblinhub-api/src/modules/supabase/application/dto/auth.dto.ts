import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  IsEnum,
  MinLength,
} from 'class-validator';
import { NivelExperiencia } from '../../domain/enums/user.enum';

export class validateTokenDto {
  @IsString()
  token: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

export class CreateTesruserDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class SignInTestuserDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class RegisterUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  nombre: string;

  @IsString()
  apellidos: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsDateString()
  fecha_nacimiento: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsEnum(NivelExperiencia)
  nivel_experiencia?: NivelExperiencia;
}
