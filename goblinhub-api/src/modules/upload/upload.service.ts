import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class UploadService {
  private readonly bucket: string;

  constructor(
    @Inject('SUPABASE_ADMIN_CLIENT') private readonly supabase: SupabaseClient,
  ) {
    this.bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'images';
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

  async uploadImage(
    file: Express.Multer.File,
    folder = 'misc',
  ): Promise<string> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Solo se permiten imágenes en formato jpeg, png, webp o gif',
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('El archivo no puede superar los 5 MB');
    }

    const { buffer, contentType, ext } = await this.compressToWebP(
      file.buffer,
      file.mimetype,
    );
    const fileName = `${folder}/${randomUUID()}${ext}`;

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(fileName, buffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      throw new InternalServerErrorException(
        `Error al subir la imagen: ${error.message}`,
      );
    }

    const { data } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  async deleteImage(publicUrl: string): Promise<void> {
    const storageBase = `${process.env.SUPABASE_URL}/storage/v1/object/public/${this.bucket}/`;

    if (!publicUrl.startsWith(storageBase)) {
      throw new BadRequestException('URL de imagen no válida para este bucket');
    }

    const filePath = publicUrl.replace(storageBase, '');

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .remove([filePath]);

    if (error) {
      throw new InternalServerErrorException(
        `Error al eliminar la imagen: ${error.message}`,
      );
    }
  }
}
