/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { NotFoundException } from '@nestjs/common';
import { UpdatePerfilUseCase, UpdatePerfilDto } from './update-perfil.use-case';
import { UsuarioRepository } from '../../domain/repositories/usuario.repository';
import { NivelExperiencia } from '../../domain/enums/user.enum';

jest.mock('ioredis', () => {
  return {
    Redis: jest.fn().mockImplementation(() => ({
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    })),
  };
});

describe('UpdatePerfilUseCase', () => {
  let useCase: UpdatePerfilUseCase;
  let usuarioRepository: jest.Mocked<UsuarioRepository>;

  const mockPerfil = {
    id_usuario: 'user-1',
    nombre: 'Juan',
    apellidos: 'Pérez',
    email: 'juan@email.com',
    telefono: '1234567890',
    fecha_nacimiento: new Date('1990-01-01'),
    nivel_experiencia: NivelExperiencia.novato,
    bio: null,
    foto_perfil_url: null,
    puntos_fidelidad: 0,
    rol: 'cliente',
    activo: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    usuarioRepository = {
      findProfileById: jest.fn(),
      updateProfile: jest.fn(),
    } as unknown as jest.Mocked<UsuarioRepository>;

    useCase = new UpdatePerfilUseCase(usuarioRepository);
  });

  it('debe actualizar el perfil correctamente con todos los campos', async () => {
    usuarioRepository.findProfileById.mockResolvedValue(mockPerfil as any);
    usuarioRepository.updateProfile.mockResolvedValue(undefined);

    const dto: UpdatePerfilDto = {
      nombre: 'Carlos',
      apellidos: 'López',
      telefono: '9876543210',
      fecha_nacimiento: '1995-06-15',
      nivel_experiencia: NivelExperiencia.intermedio,
      bio: 'Jugador apasionado',
    };

    await expect(useCase.execute('user-1', dto)).resolves.toBeUndefined();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(usuarioRepository.updateProfile).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        nombre: 'Carlos',
        apellidos: 'López',
        telefono: '9876543210',
        nivel_experiencia: NivelExperiencia.intermedio,
        bio: 'Jugador apasionado',
      }),
    );
  });

  it('debe lanzar NotFoundException si el usuario no existe', async () => {
    usuarioRepository.findProfileById.mockResolvedValue(null);

    await expect(useCase.execute('no-existe', {})).rejects.toThrow(
      NotFoundException,
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(usuarioRepository.updateProfile).not.toHaveBeenCalled();
  });

  it('debe ignorar campos no enviados (actualización parcial)', async () => {
    usuarioRepository.findProfileById.mockResolvedValue(mockPerfil as any);
    usuarioRepository.updateProfile.mockResolvedValue(undefined);

    const dto: UpdatePerfilDto = { nombre: 'Nuevo Nombre' };

    await useCase.execute('user-1', dto);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(usuarioRepository.updateProfile).toHaveBeenCalledWith('user-1', {
      nombre: 'Nuevo Nombre',
    });
  });

  it('debe permitir enviar telefono y bio como null', async () => {
    usuarioRepository.findProfileById.mockResolvedValue(mockPerfil as any);
    usuarioRepository.updateProfile.mockResolvedValue(undefined);

    const dto: UpdatePerfilDto = { telefono: null, bio: null };

    await useCase.execute('user-1', dto);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(usuarioRepository.updateProfile).toHaveBeenCalledWith('user-1', {
      telefono: null,
      bio: null,
    });
  });

  it('debe llamar a updateProfile con dto vacío si no se envía nada', async () => {
    usuarioRepository.findProfileById.mockResolvedValue(mockPerfil as any);
    usuarioRepository.updateProfile.mockResolvedValue(undefined);

    await useCase.execute('user-1', {});

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(usuarioRepository.updateProfile).toHaveBeenCalledWith('user-1', {});
  });
});
