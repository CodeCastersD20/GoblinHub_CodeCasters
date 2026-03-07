import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseRegisterUserService } from './register-user.use-case';
import { SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../../../../connect/prisma.service';
import { RegisterUserDto } from '../dto/auth.dto';
import { NivelExperiencia } from '../../domain/enums/user.enum';

describe('SupabaseRegisterUserService', () => {
  let service: SupabaseRegisterUserService;
  let supabase: jest.Mocked<SupabaseClient>;
  let supabaseAdmin: jest.Mocked<SupabaseClient>;
  let prisma: jest.Mocked<PrismaService>;
  let adminMock: { deleteUser: jest.Mock };

  const mockDto: RegisterUserDto = {
    email: 'nuevo@email.com',
    password: 'Password1',
    nombre: 'Goblin',
    apellidos: 'Verde',
    telefono: '123456789',
    fecha_nacimiento: '2000-01-15',
    bio: 'Soy un goblin',
    nivel_experiencia: NivelExperiencia.novato,
  };

  beforeEach(() => {
    supabase = {
      auth: {
        signUp: jest.fn(),
      },
    } as unknown as jest.Mocked<SupabaseClient>;

    adminMock = { deleteUser: jest.fn() };

    supabaseAdmin = {
      auth: {
        admin: adminMock,
      },
    } as unknown as jest.Mocked<SupabaseClient>;

    prisma = {
      usuario: {
        create: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    service = new SupabaseRegisterUserService(supabase, supabaseAdmin, prisma);
  });

  it('debe registrar un usuario exitosamente', async () => {
    supabase.auth.signUp = jest.fn().mockResolvedValue({
      data: {
        user: { id: 'supa-uuid-1', email: 'nuevo@email.com' },
        session: { access_token: 'tok' },
      },
      error: null,
    });

    (prisma.usuario.create as jest.Mock).mockResolvedValue({
      id_usuario: 'supa-uuid-1',
      nombre: 'Goblin',
      apellidos: 'Verde',
      rol: 'jugador',
      nivel_experiencia: NivelExperiencia.novato,
      created_at: new Date(),
    });

    const result = await service.register(mockDto);

    expect(result.success).toBe(true);
    expect(result.user.id).toBe('supa-uuid-1');
    expect(result.user.email).toBe('nuevo@email.com');
  });

  it('debe lanzar BadRequestException si supabase signUp falla', async () => {
    supabase.auth.signUp = jest.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Email already registered' },
    });

    await expect(service.register(mockDto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('debe lanzar BadRequestException si no se crea el usuario en supabase', async () => {
    supabase.auth.signUp = jest.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });

    await expect(service.register(mockDto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('debe hacer rollback (eliminar usuario de Supabase) si falla Prisma', async () => {
    supabase.auth.signUp = jest.fn().mockResolvedValue({
      data: {
        user: { id: 'supa-uuid-2', email: 'nuevo@email.com' },
        session: null,
      },
      error: null,
    });

    (prisma.usuario.create as jest.Mock).mockRejectedValue(
      new Error('Unique constraint failed'),
    );

    adminMock.deleteUser.mockResolvedValue({});

    await expect(service.register(mockDto)).rejects.toThrow(
      InternalServerErrorException,
    );

    expect(adminMock.deleteUser).toHaveBeenCalledWith('supa-uuid-2');
  });
});
