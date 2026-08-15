import { Logger, UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { SupabaseAuthGuard } from './supabse-auth.guard';
import { SupabaseValidationTokenService } from '../application/use-case/validationT.use-case';
import { User } from '@supabase/supabase-js';
import { PrismaService } from '../../../connect/prisma.service';

const mockSupabaseUser: User = {
  id: 'user-1',
  email: 'test@email.com',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: {},
  identities: [],
  created_at: '2026-01-01T00:00:00Z',
};

describe('SupabaseAuthGuard', () => {
  let guard: SupabaseAuthGuard;
  let validationService: jest.Mocked<SupabaseValidationTokenService>;
  let prismaService: { usuario: { findUnique: jest.Mock } };

  const createMockContext = (authHeader?: string): ExecutionContext => {
    const request = {
      headers: {
        authorization: authHeader,
      },
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    validationService = {
      validtoken: jest.fn(),
    } as unknown as jest.Mocked<SupabaseValidationTokenService>;

    prismaService = {
      usuario: {
        findUnique: jest.fn().mockResolvedValue({
          activo: true,
          deleted_at: null,
        }),
      },
    };

    guard = new SupabaseAuthGuard(
      validationService,
      prismaService as unknown as PrismaService,
    );
  });

  it('debe permitir acceso si el token es válido', async () => {
    validationService.validtoken.mockResolvedValue({
      success: true,
      user: mockSupabaseUser,
      message: 'Token is valid',
    });

    const context = createMockContext('Bearer valid-token');
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('debe lanzar UnauthorizedException si no hay header de autorización', async () => {
    const context = createMockContext(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('debe lanzar UnauthorizedException si el header no es string', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: 123 },
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('debe lanzar UnauthorizedException si el token falta del header Bearer', async () => {
    const context = createMockContext('Bearer');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('debe lanzar UnauthorizedException si la validación retorna success=false', async () => {
    validationService.validtoken.mockResolvedValue({
      success: false,
      user: null as unknown as User,
      message: 'Failed',
    });

    const context = createMockContext('Bearer some-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('debe lanzar UnauthorizedException si el servicio de validación lanza error', async () => {
    validationService.validtoken.mockRejectedValue(
      new Error('Service unavailable'),
    );

    const context = createMockContext('Bearer some-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('debe manejar error tipo string en extractErrorMessage', async () => {
    validationService.validtoken.mockRejectedValue('string error message');

    const context = createMockContext('Bearer some-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('debe manejar error tipo objeto con message en extractErrorMessage', async () => {
    validationService.validtoken.mockRejectedValue({ message: 'object error' });

    const context = createMockContext('Bearer some-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('debe manejar error desconocido (fallback Unknown error) en extractErrorMessage', async () => {
    validationService.validtoken.mockRejectedValue(42);

    const context = createMockContext('Bearer some-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('debe asignar el usuario al request cuando es válido', async () => {
    validationService.validtoken.mockResolvedValue({
      success: true,
      user: mockSupabaseUser,
      message: 'Token is valid',
    });

    const request: { headers: { authorization: string }; user?: unknown } = {
      headers: { authorization: 'Bearer valid-token' },
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    await guard.canActivate(context);

    expect(request.user).toEqual(mockSupabaseUser);
  });
});
