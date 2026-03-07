import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ResetPasswordUseCase } from './reset-password.use-case';
import { SupabaseClient } from '@supabase/supabase-js';

describe('ResetPasswordUseCase', () => {
  let useCase: ResetPasswordUseCase;
  let supabase: jest.Mocked<SupabaseClient>;
  let supabaseAdmin: jest.Mocked<SupabaseClient>;
  let adminMock: { updateUserById: jest.Mock };

  beforeEach(() => {
    supabase = {
      auth: {
        getUser: jest.fn(),
      },
    } as unknown as jest.Mocked<SupabaseClient>;

    adminMock = { updateUserById: jest.fn() };

    supabaseAdmin = {
      auth: {
        admin: adminMock,
      },
    } as unknown as jest.Mocked<SupabaseClient>;

    useCase = new ResetPasswordUseCase(supabase, supabaseAdmin);
  });

  it('debe actualizar la contraseña correctamente', async () => {
    supabase.auth.getUser = jest.fn().mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    adminMock.updateUserById.mockResolvedValue({
      data: { user: {} },
      error: null,
    });

    const result = await useCase.resetPassword(
      'valid-token',
      'NewPass123',
      'NewPass123',
    );

    expect(result).toEqual({
      message: 'Contraseña actualizada correctamente',
    });
  });

  it('debe lanzar BadRequestException si las contraseñas no coinciden', async () => {
    await expect(
      useCase.resetPassword('valid-token', 'NewPass123', 'Different1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe lanzar UnauthorizedException si el token es inválido', async () => {
    supabase.auth.getUser = jest.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });

    await expect(
      useCase.resetPassword('bad-token', 'NewPass123', 'NewPass123'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('debe lanzar UnauthorizedException si no se encuentra el usuario', async () => {
    supabase.auth.getUser = jest.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    });

    await expect(
      useCase.resetPassword('token-no-user', 'NewPass123', 'NewPass123'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('debe lanzar BadRequestException si falla la actualización', async () => {
    supabase.auth.getUser = jest.fn().mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    adminMock.updateUserById.mockResolvedValue({
      data: null,
      error: { message: 'Update failed' },
    });

    await expect(
      useCase.resetPassword('valid-token', 'NewPass123', 'NewPass123'),
    ).rejects.toThrow(BadRequestException);
  });
});
