import { ForbiddenException, HttpException, Injectable } from '@nestjs/common';
import { ProductRepository } from '../../domain/repositories/product.respository';
import { UsuarioRepository } from '../../../supabase/domain/repositories/usuario.repository';
import { CreateProductoDto } from '../dtos/create-product.dtos';
import { Producto } from '../../domain/entities/product.entity';
import { RolUsuario } from '../../../supabase/domain/enums/user.enum';

@Injectable()
export class CreateProductoUseCase {
  /* istanbul ignore next */
  constructor(
    private productoRepository: ProductRepository,
    private usuarioRepository: UsuarioRepository,
  ) {}

  async createProducto(
    data: CreateProductoDto,
    id_creador: string,
  ): Promise<Producto> {
    try {
      // 1. Validar permisos del usuario
      const rol = await this.usuarioRepository.findRolById(id_creador);

      if (rol !== RolUsuario.admin && rol !== RolUsuario.empleado) {
        throw new ForbiddenException('No tienes permisos para crear productos');
      }

      // 2. Construimos la entidad
      const newProducto = new Producto(
        '', // El ID vacío. Prisma generará el UUID automáticamente al guardar.
        data.nombre,
        data.categoria,
        data.precio,
        data.stock ?? 0,
        data.stock_minimo ?? 3,
        data.popular ?? false,
        data.es_nuevo ?? false,
        data.activo ?? true,
        new Date(),
        new Date(),
        data.marca,
        data.descripcion,
        data.precio_original,
        data.imagen_url,
      );

      // 3. Guardamos en la base de datos
      return await this.productoRepository.create(newProducto, id_creador);
    } catch (error) {
      if (
        error instanceof HttpException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new HttpException(
        {
          Error: `Error al crear el producto: ${(error as Error).message}`,
        },
        500,
      );
    }
  }
}
