import { UnauthorizedException } from '@nestjs/common';
import { SupabaseAuthController } from './supabase-auth.controller';
import { SupabaseValidationTokenService } from '../../application/use-case/validationT.use-case';
import { SupabaseRefreshTokenService } from '../../application/use-case/refreshT.use-case';
import { SupabaseGetUserProfileService } from '../../application/use-case/getUserProfile.use-case';
import { SupabaseCreateTestUserService } from '../../application/use-case/login-user.use-case';
import { SupabaseRegisterUserService } from '../../application/use-case/register-user.use-case';
import { GetMeUseCase } from '../../application/use-case/getMe.use-case';
import { SignInUseCase } from '../../application/use-case/signin.use-case';
import { ForgotPasswordUseCase } from '../../application/use-case/forgot-password.use-case';
import { ResetPasswordUseCase } from '../../application/use-case/reset-password.use-case';
import { AuthenticatedRequest } from '../../interfaces/types/authenticated-request.interface';
import { RolUsuario, NivelExperiencia } from '../../domain/enums/user.enum';
import { Session, User } from '@supabase/supabase-js';

describe('SupabaseAuthController', () => {
  let controller: SupabaseAuthController;
  let validationService: jest.Mocked<SupabaseValidationTokenService>;
  let refreshService: jest.Mocked<SupabaseRefreshTokenService>;
  let getUserProfileService: jest.Mocked<SupabaseGetUserProfileService>;
  let createTestUserService: jest.Mocked<SupabaseCreateTestUserService>;
  let registerUserService: jest.Mocked<SupabaseRegisterUserService>;
  let getMeUseCase: jest.Mocked<GetMeUseCase>;
  let signInUseCase: jest.Mocked<SignInUseCase>;
  let forgotPasswordUseCase: jest.Mocked<ForgotPasswordUseCase>;
  let resetPasswordUseCase: jest.Mocked<ResetPasswordUseCase>;

  beforeEach(() => {
    validationService = {
      validtoken: jest.fn(),
    } as unknown as jest.Mocked<SupabaseValidationTokenService>;

    refreshService = {
      refreshToken: jest.fn(),
    } as unknown as jest.Mocked<SupabaseRefreshTokenService>;

    getUserProfileService = {
      getUserProfile: jest.fn(),
    } as unknown as jest.Mocked<SupabaseGetUserProfileService>;

    createTestUserService = {
      signInTestuser: jest.fn(),
    } as unknown as jest.Mocked<SupabaseCreateTestUserService>;

    registerUserService = {
      register: jest.fn(),
    } as unknown as jest.Mocked<SupabaseRegisterUserService>;

    getMeUseCase = {
      getMyProfile: jest.fn(),
    } as unknown as jest.Mocked<GetMeUseCase>;

    signInUseCase = {
      signInWithCredentials: jest.fn(),
    } as unknown as jest.Mocked<SignInUseCase>;

    forgotPasswordUseCase = {
      forgotPassword: jest.fn(),
    } as unknown as jest.Mocked<ForgotPasswordUseCase>;

    resetPasswordUseCase = {
      resetPassword: jest.fn(),
    } as unknown as jest.Mocked<ResetPasswordUseCase>;

    controller = new SupabaseAuthController(
      validationService,
      refreshService,
      getUserProfileService,
      createTestUserService,
      registerUserService,
      getMeUseCase,
      signInUseCase,
      forgotPasswordUseCase,
      resetPasswordUseCase,
    );
  });

  describe('signIn', () => {
    it('debe delegar al signInUseCase', async () => {
      signInUseCase.signInWithCredentials.mockResolvedValue({
        access_token: 'tok',
        refresh_token: 'ref',
      });

      const result = await controller.signIn({
        email: 'test@email.com',
        password: 'Password1',
      });

      expect(result).toEqual({ access_token: 'tok', refresh_token: 'ref' });
    });
  });

  describe('signUp', () => {
    it('debe delegar al registerUserService', async () => {
      registerUserService.register.mockResolvedValue({
        success: true,
        message: 'User registered successfully',
        user: {
          id: 'user-1',
          email: 'new@email.com',
          nombre: 'Test',
          apellidos: 'User',
          rol: RolUsuario.jugador,
          nivel_experiencia: NivelExperiencia.novato,
          created_at: new Date(),
        },
        session: null,
      });

      const result = await controller.signUp({
        email: 'new@email.com',
        password: 'Password1',
        nombre: 'Test',
        apellidos: 'User',
        fecha_nacimiento: '2000-01-01',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('refreshToken', () => {
    it('debe delegar al refreshService', async () => {
      refreshService.refreshToken.mockResolvedValue({
        success: true,
        session: { user: null, session: null },
      });

      const result = await controller.refreshToken({
        refreshToken: 'ref-tok',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('getProfile', () => {
    it('debe retornar el perfil del usuario autenticado', async () => {
      const req = {
        user: { id: 'user-1', email: 'test@email.com' },
        headers: { authorization: 'Bearer valid-token' },
      } as unknown as AuthenticatedRequest;

      const mockProfile = {
        success: true,
        user: {
          id: 'user-1',
          email: 'test@email.com',
          createdAt: '2026-01-01',
        },
        message: 'User profile retrieved successfully',
      };
      getUserProfileService.getUserProfile.mockResolvedValue(mockProfile);

      const result = await controller.getProfile(req);
      expect(result).toEqual(mockProfile);
    });

    it('debe lanzar UnauthorizedException si no hay usuario', async () => {
      const req = {
        user: undefined,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;

      await expect(controller.getProfile(req)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debe lanzar UnauthorizedException si no hay header de autorización', async () => {
      const req = {
        user: { id: 'user-1' },
        headers: {},
      } as unknown as AuthenticatedRequest;

      await expect(controller.getProfile(req)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debe lanzar UnauthorizedException si el token no está en el header', async () => {
      const req = {
        user: { id: 'user-1' },
        headers: { authorization: 'Bearer' },
      } as unknown as AuthenticatedRequest;

      // 'Bearer'.split(' ')[1] es undefined
      await expect(controller.getProfile(req)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getMe', () => {
    it('debe retornar datos del usuario autenticado', async () => {
      const req = {
        user: { id: 'user-1', email: 'test@email.com' },
      } as unknown as AuthenticatedRequest;

      getMeUseCase.getMyProfile.mockResolvedValue({
        id: 'user-1',
        email: 'test@email.com',
        nombre: 'Test',
        rol: RolUsuario.jugador,
      });

      const result = await controller.getMe(req);
      expect(result.id).toBe('user-1');
    });

    it('debe lanzar UnauthorizedException si no hay usuario', async () => {
      const req = {
        user: undefined,
      } as unknown as AuthenticatedRequest;

      await expect(controller.getMe(req)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('verifyToken', () => {
    it('debe retornar éxito si el usuario está autenticado', () => {
      const req = {
        user: { id: 'user-1', email: 'test@email.com' },
      } as unknown as AuthenticatedRequest;

      const result = controller.verifyToken(req);
      expect(result.success).toBe(true);
    });

    it('debe lanzar UnauthorizedException si no hay usuario', () => {
      const req = {
        user: undefined,
      } as unknown as AuthenticatedRequest;

      expect(() => controller.verifyToken(req)).toThrow(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('debe delegar al forgotPasswordUseCase', async () => {
      forgotPasswordUseCase.forgotPassword.mockResolvedValue({
        message:
          'If the email is registered, you will receive a recovery link.',
      });

      const result = await controller.forgotPassword({
        email: 'test@email.com',
      });

      expect(result.message).toContain('recovery link');
    });
  });

  describe('resetPassword', () => {
    it('debe delegar al resetPasswordUseCase', async () => {
      resetPasswordUseCase.resetPassword.mockResolvedValue({
        message: 'Contraseña actualizada correctamente',
      });

      const result = await controller.resetPassword({
        accessToken: 'tok',
        newPassword: 'NewPass123',
        confirmPassword: 'NewPass123',
      });

      expect(result.message).toContain('actualizada');
    });
  });

  describe('signInTestestuser', () => {
    it('debe delegar al createTestUserService en entorno no producción', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      createTestUserService.signInTestuser.mockResolvedValue({
        success: true,
        user: {} as User,
        session: {} as Session,
        access_token: 'tok',
        refreshToken: 'ref',
        message: 'Login successful',
      });

      const result = await controller.signInTestestuser({
        email: 'admin@email.com',
        password: 'Password1',
      });

      expect(result.success).toBe(true);
      process.env.NODE_ENV = originalEnv;
    });

    it('debe lanzar UnauthorizedException en producción', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      await expect(
        controller.signInTestestuser({
          email: 'admin@email.com',
          password: 'Password1',
        }),
      ).rejects.toThrow(UnauthorizedException);

      process.env.NODE_ENV = originalEnv;
    });
  });
});
