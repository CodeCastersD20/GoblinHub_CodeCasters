import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { UsuarioRepository } from '../../domain/repositories/usuario.repository';
import { Redis } from 'ioredis';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'images';

@Injectable()
export class UpdateFotoPerfilUseCase {
  private readonly redisClient: Redis;

  /* istanbul ignore next */
  constructor(
    @Inject('SUPABASE_ADMIN_CLIENT')
    private readonly supabaseAdmin: SupabaseClient,
    private readonly usuarioRepository: UsuarioRepository,
  ) {
    this.redisClient = new Redis(process.env.REDIS_URL as string);
  }

  private async compressToWebP(
    buffer: Buffer,
    mimetype: string,
  ): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
    if (mimetype === 'image/gif') {
      return { buffer, contentType: 'image/gif', ext: '.gif' };
    }
    const compressed = await sharp(buffer).webp({ quality: 80 }).toBuffer();
    return { buffer: compressed, contentType: 'image/webp', ext: '.webp' };
  }

  async update(id_usuario: string, file: Express.Multer.File): Promise<string> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Solo se permiten imágenes jpeg, png, webp o gif',
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('El archivo no puede superar los 5 MB');
    }

    // Verificar que el usuario existe
    const perfil = await this.usuarioRepository.findProfileById(id_usuario);
    if (!perfil) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const storage = this.supabaseAdmin.storage;

    // Eliminar foto anterior si existe
    if (typeof perfil.foto_perfil_url === 'string') {
      const prevPhotoUrl = perfil.foto_perfil_url;
      const storageBase = `${process.env.SUPABASE_URL ?? ''}/storage/v1/object/public/${BUCKET}/`;
      if (prevPhotoUrl.startsWith(storageBase)) {
        const oldPath: string = prevPhotoUrl.replace(storageBase, '');
        void storage.from(BUCKET).remove([oldPath]);
      }
    }

    // Comprimir y convertir a WebP antes de subir
    const { buffer, contentType, ext } = await this.compressToWebP(
      file.buffer,
      file.mimetype,
    );
    const filePath = `profiles/${id_usuario}/${randomUUID()}${ext}`;

    const uploadResult = await storage.from(BUCKET).upload(filePath, buffer, {
      contentType,
      upsert: false,
    });

    if (uploadResult.error) {
      throw new InternalServerErrorException(
        `Error al subir la foto: ${uploadResult.error.message}`,
      );
    }

    const publicUrl = storage.from(BUCKET).getPublicUrl(filePath)
      .data.publicUrl;

    // Persistir la URL en la BD
    await this.usuarioRepository.updateFotoPerfil(id_usuario, publicUrl);

    // Invalidar caché
    await this.redisClient.del(`user:${id_usuario}:profile`);

    return publicUrl;
  }

  async delete(id_usuario: string): Promise<void> {
    const perfil = await this.usuarioRepository.findProfileById(id_usuario);
    if (!perfil) throw new NotFoundException('Usuario no encontrado');

    const storage = this.supabaseAdmin.storage;

    if (typeof perfil.foto_perfil_url === 'string') {
      const currentPhotoUrl = perfil.foto_perfil_url;
      const storageBase = `${process.env.SUPABASE_URL ?? ''}/storage/v1/object/public/${BUCKET}/`;
      if (currentPhotoUrl.startsWith(storageBase)) {
        const filePath = currentPhotoUrl.replace(storageBase, '');
        const removeResult = await storage.from(BUCKET).remove([filePath]);
        if (removeResult.error) {
          throw new InternalServerErrorException(
            `Error al eliminar la foto: ${removeResult.error.message}`,
          );
        }
      }
    }

    await this.usuarioRepository.updateFotoPerfil(id_usuario, null);

    // Invalidar caché
    await this.redisClient.del(`user:${id_usuario}:profile`);
  }
}
