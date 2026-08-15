/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UpdateFotoPerfilUseCase } from './update-foto-perfil.use-case';
import { UsuarioRepository } from '../../domain/repositories/usuario.repository';
import { SupabaseClient } from '@supabase/supabase-js';

jest.mock('ioredis', () => {
  return {
    Redis: jest.fn().mockImplementation(() => ({
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    })),
  };
});

// Mock sharp at module level so compress never touches real image processing
jest.mock('sharp', () => {
  const chain = {
    webp: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('compressed')),
  };
  return jest.fn(() => chain);
});

const mockBuffer = Buffer.from('fake-image-data');

const buildFile = (
  mimetype = 'image/jpeg',
  size = 1024,
): Express.Multer.File => ({
  mimetype,
  size,
  buffer: mockBuffer,
  originalname: 'foto.jpg',
  fieldname: 'file',
  encoding: '7bit',
  destination: '',
  filename: '',
  path: '',
  stream: null as unknown as import('stream').Readable,
});

describe('UpdateFotoPerfilUseCase', () => {
  let useCase: UpdateFotoPerfilUseCase;
  let usuarioRepository: jest.Mocked<UsuarioRepository>;
  let supabaseAdmin: jest.Mocked<SupabaseClient>;

  const mockStorage = {
    from: jest.fn(),
  };

  const mockPerfil = {
    id_usuario: 'user-1',
    nombre: 'Juan',
    foto_perfil_url: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    usuarioRepository = {
      findProfileById: jest.fn(),
      updateFotoPerfil: jest.fn(),
    } as unknown as jest.Mocked<UsuarioRepository>;

    supabaseAdmin = {
      storage: mockStorage,
    } as unknown as jest.Mocked<SupabaseClient>;

    useCase = new UpdateFotoPerfilUseCase(supabaseAdmin, usuarioRepository);

    // Default storage mock chain
    mockStorage.from.mockReturnValue({
      upload: jest.fn().mockResolvedValue({ data: { path: 'x' }, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: 'https://supabase.io/foto.webp' },
      }),
      remove: jest.fn().mockResolvedValue({ error: null }),
    });
  });

  describe('update()', () => {
    it('debe lanzar BadRequestException si el tipo MIME no es permitido', async () => {
      await expect(
        useCase.update('user-1', buildFile('application/pdf')),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar BadRequestException si el archivo supera 5 MB', async () => {
      await expect(
        useCase.update('user-1', buildFile('image/jpeg', 6 * 1024 * 1024)),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      usuarioRepository.findProfileById.mockResolvedValue(null);

      await expect(useCase.update('no-existe', buildFile())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe subir una imagen jpeg y retornar la URL pública', async () => {
      usuarioRepository.findProfileById.mockResolvedValue(mockPerfil as any);
      usuarioRepository.updateFotoPerfil.mockResolvedValue(undefined);

      const result = await useCase.update('user-1', buildFile('image/jpeg'));
      expect(typeof result).toBe('string');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(usuarioRepository.updateFotoPerfil).toHaveBeenCalled();
    });

    it('debe subir un gif sin comprimir y retornar la URL pública', async () => {
      usuarioRepository.findProfileById.mockResolvedValue(mockPerfil as any);
      usuarioRepository.updateFotoPerfil.mockResolvedValue(undefined);

      const result = await useCase.update('user-1', buildFile('image/gif'));
      expect(typeof result).toBe('string');
    });

    it('debe eliminar la foto anterior si el usuario ya tenía una', async () => {
      const perfilConFoto = {
        ...mockPerfil,
        foto_perfil_url: `${process.env.SUPABASE_URL ?? ''}/storage/v1/object/public/images/profiles/user-1/old.webp`,
      };
      usuarioRepository.findProfileById.mockResolvedValue(perfilConFoto as any);
      usuarioRepository.updateFotoPerfil.mockResolvedValue(undefined);

      const removeMock = jest.fn().mockResolvedValue({ error: null });
      mockStorage.from.mockReturnValue({
        upload: jest
          .fn()
          .mockResolvedValue({ data: { path: 'x' }, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://supabase.io/new.webp' },
        }),
        remove: removeMock,
      });

      await useCase.update('user-1', buildFile('image/jpeg'));
      expect(removeMock).toHaveBeenCalled();
    });

    it('debe lanzar InternalServerErrorException si upload falla', async () => {
      usuarioRepository.findProfileById.mockResolvedValue(mockPerfil as any);

      mockStorage.from.mockReturnValue({
        upload: jest
          .fn()
          .mockResolvedValue({ error: { message: 'Bucket error' } }),
        getPublicUrl: jest.fn(),
        remove: jest.fn(),
      });

      await expect(
        useCase.update('user-1', buildFile('image/jpeg')),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('no debe intentar eliminar foto si la URL previa no pertenece al bucket', async () => {
      const perfilConFotoExterna = {
        ...mockPerfil,
        foto_perfil_url: 'https://cdn.external.com/old-photo.jpg',
      };
      usuarioRepository.findProfileById.mockResolvedValue(
        perfilConFotoExterna as any,
      );
      usuarioRepository.updateFotoPerfil.mockResolvedValue(undefined);

      const removeMock = jest.fn();
      mockStorage.from.mockReturnValue({
        upload: jest
          .fn()
          .mockResolvedValue({ data: { path: 'x' }, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://supabase.io/new.webp' },
        }),
        remove: removeMock,
      });

      await useCase.update('user-1', buildFile('image/jpeg'));
      expect(removeMock).not.toHaveBeenCalled();
    });
  });

  describe('delete()', () => {
    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      usuarioRepository.findProfileById.mockResolvedValue(null);
      await expect(useCase.delete('no-existe')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe eliminar la foto y limpiar la URL en BD', async () => {
      const perfilConFoto = {
        ...mockPerfil,
        foto_perfil_url: `${process.env.SUPABASE_URL ?? ''}/storage/v1/object/public/images/profiles/user-1/foto.webp`,
      };
      usuarioRepository.findProfileById.mockResolvedValue(perfilConFoto as any);
      usuarioRepository.updateFotoPerfil.mockResolvedValue(undefined);

      const removeMock = jest.fn().mockResolvedValue({ error: null });
      mockStorage.from.mockReturnValue({ remove: removeMock });

      await useCase.delete('user-1');

      expect(removeMock).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(usuarioRepository.updateFotoPerfil).toHaveBeenCalledWith(
        'user-1',
        null,
      );
    });

    it('debe lanzar InternalServerErrorException si remove falla al eliminar', async () => {
      const perfilConFoto = {
        ...mockPerfil,
        foto_perfil_url: `${process.env.SUPABASE_URL ?? ''}/storage/v1/object/public/images/profiles/user-1/foto.webp`,
      };
      usuarioRepository.findProfileById.mockResolvedValue(perfilConFoto as any);

      const removeMock = jest
        .fn()
        .mockResolvedValue({ error: { message: 'Remove failed' } });
      mockStorage.from.mockReturnValue({ remove: removeMock });

      await expect(useCase.delete('user-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('debe salir sin error si el usuario no tiene foto asignada', async () => {
      usuarioRepository.findProfileById.mockResolvedValue(mockPerfil as any);
      usuarioRepository.updateFotoPerfil.mockResolvedValue(undefined);

      await expect(useCase.delete('user-1')).resolves.toBeUndefined();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(usuarioRepository.updateFotoPerfil).toHaveBeenCalledWith(
        'user-1',
        null,
      );
    });

    it('no debe intentar eliminar del storage si la URL de foto no pertenece al bucket', async () => {
      const perfilConFotoExterna = {
        ...mockPerfil,
        foto_perfil_url: 'https://cdn.external.com/photo.jpg',
      };
      usuarioRepository.findProfileById.mockResolvedValue(
        perfilConFotoExterna as any,
      );
      usuarioRepository.updateFotoPerfil.mockResolvedValue(undefined);

      const removeMock = jest.fn();
      mockStorage.from.mockReturnValue({ remove: removeMock });

      await useCase.delete('user-1');

      expect(removeMock).not.toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(usuarioRepository.updateFotoPerfil).toHaveBeenCalledWith(
        'user-1',
        null,
      );
    });
  });
});
