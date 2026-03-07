import { Logger } from '@nestjs/common';
import { ForgotPasswordUseCase } from './forgot-password.use-case';
import { SupabaseClient } from '@supabase/supabase-js';

describe('ForgotPasswordUseCase', () => {
  let useCase: ForgotPasswordUseCase;
  let supabase: jest.Mocked<SupabaseClient>;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    supabase = {
      auth: {
        resetPasswordForEmail: jest.fn(),
      },
    } as unknown as jest.Mocked<SupabaseClient>;

    useCase = new ForgotPasswordUseCase(supabase);
  });

  it('debe retornar mensaje genérico cuando el email existe', async () => {
    supabase.auth.resetPasswordForEmail = jest.fn().mockResolvedValue({
      data: {},
      error: null,
    });

    const result = await useCase.forgotPassword('test@email.com');

    expect(result).toEqual({
      message: 'If the email is registered, you will receive a recovery link.',
    });
  });

  it('debe retornar el mismo mensaje genérico incluso si hay error (evita enumeración de usuarios)', async () => {
    supabase.auth.resetPasswordForEmail = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'User not found' },
    });

    const result = await useCase.forgotPassword('noexiste@email.com');

    expect(result).toEqual({
      message: 'If the email is registered, you will receive a recovery link.',
    });
  });
});
