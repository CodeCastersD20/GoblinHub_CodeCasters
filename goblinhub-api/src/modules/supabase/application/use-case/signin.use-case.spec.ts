import { BadRequestException } from '@nestjs/common';
import { SignInUseCase } from './signin.use-case';
import { SupabaseClient } from '@supabase/supabase-js';

describe('SignInUseCase', () => {
  let useCase: SignInUseCase;
  let supabase: jest.Mocked<SupabaseClient>;

  beforeEach(() => {
    supabase = {
      auth: {
        signInWithPassword: jest.fn(),
      },
    } as unknown as jest.Mocked<SupabaseClient>;

    useCase = new SignInUseCase(supabase);
  });

  it('debe retornar access_token y refresh_token si el login es exitoso', async () => {
    supabase.auth.signInWithPassword = jest.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'access-123',
          refresh_token: 'refresh-456',
        },
        user: { id: 'user-1' },
      },
      error: null,
    });

    const result = await useCase.signInWithCredentials(
      'test@email.com',
      'Password1',
    );

    expect(result).toEqual({
      access_token: 'access-123',
      refresh_token: 'refresh-456',
    });
  });

  it('debe lanzar BadRequestException si supabase retorna error', async () => {
    supabase.auth.signInWithPassword = jest.fn().mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' },
    });

    await expect(
      useCase.signInWithCredentials('test@email.com', 'Wrong1234'),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe lanzar BadRequestException si no se crea sesión', async () => {
    supabase.auth.signInWithPassword = jest.fn().mockResolvedValue({
      data: { session: null, user: { id: 'user-1' } },
      error: null,
    });

    await expect(
      useCase.signInWithCredentials('test@email.com', 'Password1'),
    ).rejects.toThrow(BadRequestException);
  });
});
