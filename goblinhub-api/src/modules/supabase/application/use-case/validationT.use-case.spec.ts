import { UnauthorizedException } from '@nestjs/common';
import { SupabaseValidationTokenService } from './validationT.use-case';
import * as jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

describe('SupabaseValidationTokenService', () => {
  let service: SupabaseValidationTokenService;

  beforeEach(() => {
    process.env.SUPABASE_JWT_SECRET = 'test-secret';
    service = new SupabaseValidationTokenService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe retornar éxito y usuario si el token es válido', async () => {
    const mockDecoded = {
      sub: 'user-1',
      email: 'test@email.com',
      role: 'authenticated',
      iat: 1620000000,
    };

    (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);

    const result = await service.validtoken('valid-token');

    expect(result.success).toBe(true);
    expect(result.user.id).toBe('user-1');
    expect(result.message).toBe('Token is valid (local)');
  });

  it('debe lanzar UnauthorizedException si jwt.verify falla', async () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('Token expired');
    });

    await expect(service.validtoken('expired-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('debe lanzar UnauthorizedException si el token decodificado no tiene sub', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ email: 'test@email.com' });

    await expect(service.validtoken('invalid-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
