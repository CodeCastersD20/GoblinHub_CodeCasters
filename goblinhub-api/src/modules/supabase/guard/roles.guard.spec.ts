import { ForbiddenException, Logger } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UsuarioRepository } from '../domain/repositories/usuario.repository';
import { RolUsuario } from '../domain/enums/user.enum';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;
  let usuarioRepo: jest.Mocked<UsuarioRepository>;

  const createMockContext = (userId?: string): ExecutionContext => {
    const request = {
      user: userId ? { id: userId } : undefined,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    usuarioRepo = {
      findRolById: jest.fn(),
      findProfileById: jest.fn(),
    } as unknown as jest.Mocked<UsuarioRepository>;

    jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    guard = new RolesGuard(reflector, usuarioRepo);
  });

  it('debe permitir acceso si no hay roles requeridos (@Roles no aplicado)', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const context = createMockContext('user-1');
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('debe permitir acceso si los roles requeridos es un arreglo vacío', async () => {
    reflector.getAllAndOverride.mockReturnValue([]);

    const context = createMockContext('user-1');
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('debe permitir acceso si el usuario tiene el rol requerido', async () => {
    reflector.getAllAndOverride.mockReturnValue([RolUsuario.admin]);
    usuarioRepo.findRolById.mockResolvedValue(RolUsuario.admin);

    const context = createMockContext('admin-1');
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('debe lanzar ForbiddenException si el usuario no tiene el rol requerido', async () => {
    reflector.getAllAndOverride.mockReturnValue([RolUsuario.admin]);
    usuarioRepo.findRolById.mockResolvedValue(RolUsuario.jugador);

    const context = createMockContext('jugador-1');

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('debe lanzar ForbiddenException si no se encuentra identidad del usuario', async () => {
    reflector.getAllAndOverride.mockReturnValue([RolUsuario.admin]);

    const context = createMockContext(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('debe lanzar ForbiddenException si el usuario no existe en la BD', async () => {
    reflector.getAllAndOverride.mockReturnValue([RolUsuario.admin]);
    usuarioRepo.findRolById.mockResolvedValue(null);

    const context = createMockContext('nonexistent-1');

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('debe permitir acceso si el usuario tiene uno de múltiples roles requeridos', async () => {
    reflector.getAllAndOverride.mockReturnValue([
      RolUsuario.admin,
      RolUsuario.empleado,
    ]);
    usuarioRepo.findRolById.mockResolvedValue(RolUsuario.empleado);

    const context = createMockContext('emp-1');
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });
});
