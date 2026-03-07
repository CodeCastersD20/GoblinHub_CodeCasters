import { UnauthorizedException } from '@nestjs/common';
import { SupabaseRefreshTokenService } from './refreshT.use-case';
import { SupabaseClient } from '@supabase/supabase-js';

describe('SupabaseRefreshTokenService', () => {
  let service: SupabaseRefreshTokenService;
  let supabase: jest.Mocked<SupabaseClient>;

  beforeEach(() => {
    supabase = {
      auth: {
        refreshSession: jest.fn(),
      },
    } as unknown as jest.Mocked<SupabaseClient>;

    service = new SupabaseRefreshTokenService(supabase);
  });

  it('debe retornar la sesión renovada', async () => {
    const mockSession = {
      access_token: 'new-access',
      refresh_token: 'new-refresh',
    };

    supabase.auth.refreshSession = jest.fn().mockResolvedValue({
      data: mockSession,
      error: null,
    });

    const result = await service.refreshToken('old-refresh-token');

    expect(result.success).toBe(true);
    expect(result.session).toEqual(mockSession);
  });

  it('debe lanzar UnauthorizedException si supabase retorna error', async () => {
    supabase.auth.refreshSession = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'Token expired' },
    });

    await expect(service.refreshToken('expired-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('debe lanzar UnauthorizedException si ocurre una excepción inesperada', async () => {
    supabase.auth.refreshSession = jest
      .fn()
      .mockRejectedValue(new Error('Network error'));

    await expect(service.refreshToken('any-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
