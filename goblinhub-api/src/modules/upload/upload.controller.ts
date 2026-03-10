import {
  BadRequestException,
  Controller,
  Delete,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { UploadService } from './upload.service';
import { SupabaseAuthGuard } from '../supabase/guard/supabse-auth.guard';
import { RolesGuard } from '../supabase/guard/roles.guard';
import { Roles } from '../supabase/guard/roles.decorator';
import { RolUsuario } from '../supabase/domain/enums/user.enum';

@ApiTags('Upload')
@ApiBearerAuth('access-token')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles(RolUsuario.admin, RolUsuario.empleado)
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    }),
  )
  @ApiOperation({ summary: 'Subir una imagen a Supabase Storage' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Imagen (jpeg, png, webp, gif · máx 5 MB)',
        },
      },
    },
  })
  @ApiQuery({
    name: 'folder',
    required: false,
    example: 'products',
    description:
      'Subcarpeta destino dentro del bucket (ej: products, events, profiles)',
  })
  @ApiResponse({
    status: 201,
    description: 'URL pública de la imagen subida',
    schema: {
      example: {
        url: 'https://…/storage/v1/object/public/images/products/uuid.jpg',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Archivo no válido o demasiado grande',
  })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException(
        'Se requiere un archivo de imagen válido (jpeg, png, webp, gif)',
      );
    }

    const url = await this.uploadService.uploadImage(file, folder);
    return { url };
  }

  @Delete()
  @ApiOperation({
    summary: 'Eliminar una imagen de Supabase Storage por su URL pública',
  })
  @ApiQuery({
    name: 'url',
    required: true,
    description: 'URL pública de la imagen a eliminar',
  })
  @ApiResponse({ status: 200, description: 'Imagen eliminada correctamente' })
  @ApiResponse({ status: 400, description: 'URL no válida' })
  async deleteImage(@Query('url') url: string): Promise<{ message: string }> {
    if (!url) {
      throw new BadRequestException('Se requiere el parámetro url');
    }

    await this.uploadService.deleteImage(url);
    return { message: 'Imagen eliminada correctamente' };
  }
}
