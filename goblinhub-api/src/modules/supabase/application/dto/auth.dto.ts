import { IsString, IsEmail } from 'class-validator';

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
