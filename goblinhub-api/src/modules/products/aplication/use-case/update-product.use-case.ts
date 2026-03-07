import { ForbiddenException, HttpException, Injectable } from '@nestjs/common';
import { UpdateProductoDto } from '../dtos/update-product.dto';
import { Producto } from '../../domain/entities/product.entity';
import { ProductRepository } from '../../domain/repositories/product.respository';
import { UsuarioRepository } from '../../../supabase/domain/repositories/usuario.repository';
import { RolUsuario } from '../../../supabase/domain/enums/user.enum';

@Injectable()
export class UpdateProductoUseCase {
  constructor(
    private productoRepository: ProductRepository,
    private usuarioRepository: UsuarioRepository,
  ) {}

  async updateProducto(
    id: string,
    data: UpdateProductoDto,
    id_usuario: string,
  ): Promise<Producto> {
    try {
      // 1. Validar permisos del usuario
      const rol = await this.usuarioRepository.findRolById(id_usuario);
      const isAdmin = rol === RolUsuario.admin;

      if (!isAdmin && rol !== RolUsuario.empleado) {
        throw new ForbiddenException(
          'No tienes permisos para actualizar productos',
        );
      }

      // 2. Verificamos que el producto exista por su ID
      const existProducto = await this.productoRepository.findById(id);

      if (!existProducto) {
        throw new HttpException({ Error: 'No se encontró el producto' }, 404);
      }

      // 3. Verificar propiedad si es empleado
      if (!isAdmin && existProducto.id_creador !== id_usuario) {
        throw new ForbiddenException(
          'Solo puedes editar productos que hayas creado tú',
        );
      }

      const updatedProducto = new Producto(
        // --- Requeridos ---
        existProducto.id_producto,
        data.nombre ?? existProducto.nombre,
        data.categoria ?? existProducto.categoria,
        data.precio ?? existProducto.precio,
        data.stock ?? existProducto.stock,
        data.stock_minimo ?? existProducto.stock_minimo,
        data.popular ?? existProducto.popular,
        data.es_nuevo ?? existProducto.es_nuevo,
        data.activo ?? existProducto.activo,
        existProducto.created_at, // Conservamos la fecha de creación original
        new Date(), // Actualizamos la fecha de modificación

        // --- Opcionales ---
        data.marca ?? existProducto.marca,
        data.descripcion ?? existProducto.descripcion,
        data.precio_original ?? existProducto.precio_original,
        data.imagen_url ?? existProducto.imagen_url,
        existProducto.deleted_at, // Mantenemos el estado de borrado
      );

      // 3. Guardamos los cambios
      return await this.productoRepository.update(id, updatedProducto);
    } catch (error) {
      if (
        error instanceof HttpException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new HttpException(
        {
          Error: `Error al actualizar el producto: ${(error as Error).message}`,
        },
        500,
      );
    }
  }
}
