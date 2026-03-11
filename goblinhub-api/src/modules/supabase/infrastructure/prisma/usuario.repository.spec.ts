import { UsuarioRepositoryPrisma } from './usuario.repository';
import { PrismaService } from '../../../../connect/prisma.service';
import { RolUsuario } from '../../domain/enums/user.enum';

describe('UsuarioRepositoryPrisma', () => {
  let repository: UsuarioRepositoryPrisma;
  let prisma: jest.Mocked<PrismaService>;
  let findUniqueMock: jest.Mock;

  beforeEach(() => {
    findUniqueMock = jest.fn();

    prisma = {
      usuario: {
        findUnique: findUniqueMock,
      },
    } as unknown as jest.Mocked<PrismaService>;

    repository = new UsuarioRepositoryPrisma(prisma);
  });

  describe('findRolById', () => {
    it('debe retornar el rol del usuario', async () => {
      findUniqueMock.mockResolvedValue({
        rol: 'admin',
      });

      const result = await repository.findRolById('user-123');

      expect(result).toBe(RolUsuario.admin);
      expect(findUniqueMock).toHaveBeenCalledWith({
        where: { id_usuario: 'user-123' },
        select: { rol: true },
      });
    });

    it('debe retornar null si el usuario no existe', async () => {
      findUniqueMock.mockResolvedValue(null);

      const result = await repository.findRolById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findProfileById', () => {
    it('debe retornar el perfil del usuario', async () => {
      findUniqueMock.mockResolvedValue({
        rol: 'jugador',
        nombre: 'Goblin Master',
        apellidos: 'Test',
        telefono: null,
        fecha_nacimiento: new Date('2000-01-01'),
        nivel_experiencia: 'novato',
        puntos_fidelidad: 0,
        bio: null,
        foto_perfil_url: null,
      });

      const result = await repository.findProfileById('user-123');

      expect(result).toEqual({
        rol: RolUsuario.jugador,
        nombre: 'Goblin Master',
        apellidos: 'Test',
        telefono: null,
        fecha_nacimiento: new Date('2000-01-01'),
        nivel_experiencia: 'novato',
        puntos_fidelidad: 0,
        bio: null,
        foto_perfil_url: null,
      });
      expect(findUniqueMock).toHaveBeenCalledWith({
        where: { id_usuario: 'user-123' },
        select: {
          rol: true,
          nombre: true,
          apellidos: true,
          telefono: true,
          fecha_nacimiento: true,
          nivel_experiencia: true,
          puntos_fidelidad: true,
          bio: true,
          foto_perfil_url: true,
        },
      });
    });

    it('debe retornar null si el usuario no existe', async () => {
      findUniqueMock.mockResolvedValue(null);

      const result = await repository.findProfileById('nonexistent');

      expect(result).toBeNull();
    });
  });
});
