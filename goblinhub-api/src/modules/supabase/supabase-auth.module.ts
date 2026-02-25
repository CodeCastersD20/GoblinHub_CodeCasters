import { Module } from '@nestjs/common';
import { SupabaseModule } from './supabase.module';
import { PrismaModule } from '../../connect/prisma.module';
import { SupabaseAuthController } from './infrastructure/controller/supabase-auth.controller';
import { SupabaseValidationTokenService } from './application/use-case/validationT.use-case';
import { SupabaseGetUserProfileService } from './application/use-case/getUserProfile.use-case';
import { SupabaseRefreshTokenService } from './application/use-case/refreshT.use-case';
import { SupabaseCreateTestUserService } from './application/use-case/login-user.use-case';
import { SupabaseRegisterUserService } from './application/use-case/register-user.use-case';
import { SupabaseAuthGuard } from './guard/supabse-auth.guard';
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
    SupabaseAuthController,
    SupabaseAuthGuard,
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
    UsuarioRepository,
  ],
})
export class SupabaseAuthModule {}
