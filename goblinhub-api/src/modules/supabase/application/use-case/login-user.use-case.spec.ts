import { BadRequestException } from '@nestjs/common';
import { SupabaseCreateTestUserService } from './login-user.use-case';
import { SupabaseClient } from '@supabase/supabase-js';

describe('SupabaseCreateTestUserService', () => {
  let service: SupabaseCreateTestUserService;
  let supabase: jest.Mocked<SupabaseClient>;

  beforeEach(() => {
    supabase = {
      auth: {
        signInWithPassword: jest.fn(),
      },
    } as unknown as jest.Mocked<SupabaseClient>;

    service = new SupabaseCreateTestUserService(supabase);
  });

  describe('signInTestuser', () => {
    it('debe retornar sesión completa si el login es exitoso', async () => {
      supabase.auth.signInWithPassword = jest.fn().mockResolvedValue({
        data: {
          user: { id: 'user-1', email: 'test@email.com' },
          session: {
            access_token: 'access-tok',
            refresh_token: 'refresh-tok',
          },
        },
        error: null,
      });

      const result = await service.signInTestuser(
        'test@email.com',
        'Password1',
      );

      expect(result.success).toBe(true);
      expect(result.access_token).toBe('access-tok');
      expect(result.refreshToken).toBe('refresh-tok');
    });

    it('debe lanzar BadRequestException si supabase retorna error', async () => {
      supabase.auth.signInWithPassword = jest.fn().mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Invalid credentials' },
      });

      await expect(
        service.signInTestuser('test@email.com', 'Wrong1234'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar BadRequestException si no se crea sesión', async () => {
      supabase.auth.signInWithPassword = jest.fn().mockResolvedValue({
        data: { session: null, user: { id: 'user-1' } },
        error: null,
      });

      await expect(
        service.signInTestuser('test@email.com', 'Password1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar BadRequestException si ocurre un error inesperado', async () => {
      supabase.auth.signInWithPassword = jest
        .fn()
        .mockRejectedValue(new Error('Network error'));

      await expect(
        service.signInTestuser('test@email.com', 'Password1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listAuthUsers', () => {
    it('debe retornar un mensaje informativo', () => {
      const result = service.listAuthUsers();

      expect(result.success).toBe(true);
      expect(result.message).toContain('admin access');
    });
  });
});
