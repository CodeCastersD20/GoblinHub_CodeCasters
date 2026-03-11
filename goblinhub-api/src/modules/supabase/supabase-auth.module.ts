import { Module } from '@nestjs/common';
import { SupabaseModule } from './supabase.module';
import { PrismaModule } from '../../connect/prisma.module';
import { SupabaseAuthController } from './infrastructure/controller/supabase-auth.controller';
import { SupabaseValidationTokenService } from './application/use-case/validationT.use-case';
import { SupabaseGetUserProfileService } from './application/use-case/getUserProfile.use-case';
import { SupabaseRefreshTokenService } from './application/use-case/refreshT.use-case';
import { SupabaseCreateTestUserService } from './application/use-case/login-user.use-case';
import { SupabaseRegisterUserService } from './application/use-case/register-user.use-case';
import { GetMeUseCase } from './application/use-case/getMe.use-case';
import { SignInUseCase } from './application/use-case/signin.use-case';
import { ForgotPasswordUseCase } from './application/use-case/forgot-password.use-case';
import { ResetPasswordUseCase } from './application/use-case/reset-password.use-case';
import { UpdateFotoPerfilUseCase } from './application/use-case/update-foto-perfil.use-case';
import { UpdatePerfilUseCase } from './application/use-case/update-perfil.use-case';
import { SupabaseAuthGuard } from './guard/supabse-auth.guard';
import { RolesGuard } from './guard/roles.guard';
import { UsuarioRepository } from './domain/repositories/usuario.repository';
import { UsuarioRepositoryPrisma } from './infrastructure/prisma/usuario.repository';

@Module({
  imports: [SupabaseModule, PrismaModule],
  controllers: [SupabaseAuthController],
  providers: [
    SupabaseValidationTokenService,
    SupabaseGetUserProfileService,
    SupabaseRefreshTokenService,
    SupabaseCreateTestUserService,
    SupabaseRegisterUserService,
    GetMeUseCase,
    SignInUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    UpdateFotoPerfilUseCase,
    UpdatePerfilUseCase,
    SupabaseAuthGuard,
    RolesGuard,
    {
      provide: UsuarioRepository,
      useClass: UsuarioRepositoryPrisma,
    },
  ],
  exports: [
    SupabaseValidationTokenService,
    SupabaseGetUserProfileService,
    SupabaseRefreshTokenService,
    SupabaseAuthGuard,
    RolesGuard,
    UsuarioRepository,
  ],
})
export class SupabaseAuthModule {}
