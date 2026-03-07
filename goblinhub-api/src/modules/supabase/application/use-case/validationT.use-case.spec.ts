import { UnauthorizedException } from '@nestjs/common';
import { SupabaseValidationTokenService } from './validationT.use-case';
import { SupabaseClient } from '@supabase/supabase-js';

describe('SupabaseValidationTokenService', () => {
  let service: SupabaseValidationTokenService;
  let supabase: jest.Mocked<SupabaseClient>;

  beforeEach(() => {
    supabase = {
      auth: {
        getUser: jest.fn(),
      },
    } as unknown as jest.Mocked<SupabaseClient>;

    service = new SupabaseValidationTokenService(supabase);
  });

  it('debe retornar éxito y usuario si el token es válido', async () => {
    const mockUser = { id: 'user-1', email: 'test@email.com' };

    supabase.auth.getUser = jest.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const result = await service.validtoken('valid-token');

    expect(result.success).toBe(true);
    expect(result.user).toEqual(mockUser);
    expect(result.message).toBe('Token is valid');
  });

  it('debe lanzar UnauthorizedException si supabase retorna error', async () => {
    supabase.auth.getUser = jest.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'Token expired' },
    });

    await expect(service.validtoken('expired-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('debe lanzar UnauthorizedException si no hay usuario', async () => {
    supabase.auth.getUser = jest.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    });

    await expect(service.validtoken('no-user-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('debe lanzar UnauthorizedException si ocurre una excepción', async () => {
    supabase.auth.getUser = jest
      .fn()
      .mockRejectedValue(new Error('Network error'));

    await expect(service.validtoken('any-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
