import { ForbiddenException, HttpException, Injectable } from '@nestjs/common';
import { ProductRepository } from '../../domain/repositories/product.respository';
import { UsuarioRepository } from '../../../supabase/domain/repositories/usuario.repository';
import { RolUsuario } from '../../../supabase/domain/enums/user.enum';

@Injectable()
export class SoftDeleteProductoUseCase {
  constructor(
    private productoRepository: ProductRepository,
    private usuarioRepository: UsuarioRepository,
  ) {}

  async softDeleteProducto(id: string, id_usuario: string): Promise<void> {
    try {
      // 1. Validar que solo admin puede eliminar
      const rol = await this.usuarioRepository.findRolById(id_usuario);

      if (rol !== RolUsuario.admin) {
        throw new ForbiddenException(
          'Solo un administrador puede eliminar productos',
        );
      }

      // 2. Verificamos que el producto realmente exista
      const productoExistente = await this.productoRepository.findById(id);

      if (!productoExistente) {
        throw new HttpException(
          { Error: 'No se encontró el producto a eliminar' },
          404,
        );
      }

      // 2. Si existe, procedemos a hacer el soft delete
      await this.productoRepository.delete(id);
    } catch (error) {
      if (
        error instanceof HttpException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new HttpException(
        {
          Error: `Error al eliminar el producto: ${(error as Error).message}`,
        },
        500,
      );
    }
  }
}
