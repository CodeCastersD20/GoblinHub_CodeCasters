import { UnauthorizedException } from '@nestjs/common';
import { SupabaseGetUserProfileService } from './getUserProfile.use-case';
import { SupabaseClient } from '@supabase/supabase-js';

describe('SupabaseGetUserProfileService', () => {
  let service: SupabaseGetUserProfileService;
  let supabase: jest.Mocked<SupabaseClient>;

  beforeEach(() => {
    supabase = {
      auth: {
        getUser: jest.fn(),
      },
    } as unknown as jest.Mocked<SupabaseClient>;

    service = new SupabaseGetUserProfileService(supabase);
  });

  it('debe retornar el perfil del usuario si el token es válido', async () => {
    supabase.auth.getUser = jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'test@email.com',
          created_at: '2026-01-01',
        },
      },
      error: null,
    });

    const result = await service.getUserProfile('valid-token');

    expect(result.success).toBe(true);
    expect(result.user.id).toBe('user-1');
    expect(result.user.email).toBe('test@email.com');
  });

  it('debe lanzar UnauthorizedException si supabase retorna error', async () => {
    supabase.auth.getUser = jest.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });

    await expect(service.getUserProfile('bad-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('debe lanzar UnauthorizedException si no hay datos de usuario', async () => {
    supabase.auth.getUser = jest.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    });

    await expect(service.getUserProfile('empty-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('debe lanzar UnauthorizedException si hay un error inesperado', async () => {
    supabase.auth.getUser = jest
      .fn()
      .mockRejectedValue(new Error('Network failure'));

    await expect(service.getUserProfile('token')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
