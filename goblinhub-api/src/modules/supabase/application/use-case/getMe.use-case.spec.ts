import { NotFoundException } from '@nestjs/common';
import { GetMeUseCase } from './getMe.use-case';
import { UsuarioRepository } from '../../domain/repositories/usuario.repository';
import { RolUsuario } from '../../domain/enums/user.enum';

describe('GetMeUseCase', () => {
  let useCase: GetMeUseCase;
  let usuarioRepo: jest.Mocked<UsuarioRepository>;

  beforeEach(() => {
    usuarioRepo = {
      findProfileById: jest.fn(),
      findRolById: jest.fn(),
      updateFotoPerfil: jest.fn(),
    } as unknown as jest.Mocked<UsuarioRepository>;

    useCase = new GetMeUseCase(usuarioRepo);
  });

  it('debe retornar el perfil del usuario', async () => {
    usuarioRepo.findProfileById.mockResolvedValue({
      nombre: 'Goblin Master',
      rol: RolUsuario.jugador,
      foto_perfil_url: null,
    });

    const result = await useCase.getMyProfile('user-123', 'test@email.com');

    expect(result).toEqual({
      id: 'user-123',
      email: 'test@email.com',
      nombre: 'Goblin Master',
      rol: RolUsuario.jugador,
      foto_perfil_url: null,
    });
  });

  it('debe lanzar NotFoundException si el usuario no existe', async () => {
    usuarioRepo.findProfileById.mockResolvedValue(null);

    await expect(
      useCase.getMyProfile('user-999', 'noexiste@email.com'),
    ).rejects.toThrow(NotFoundException);
  });

  it('debe funcionar con email undefined', async () => {
    usuarioRepo.findProfileById.mockResolvedValue({
      nombre: 'Admin',
      rol: RolUsuario.admin,
      foto_perfil_url: null,
    });

    const result = await useCase.getMyProfile('user-456', undefined);

    expect(result).toEqual({
      id: 'user-456',
      email: undefined,
      nombre: 'Admin',
      rol: RolUsuario.admin,
      foto_perfil_url: null,
    });
  });

  it('[CI TEST] fallo intencional para demostrar pipeline', () => {
    expect(true).toBe(false);
  });
});
