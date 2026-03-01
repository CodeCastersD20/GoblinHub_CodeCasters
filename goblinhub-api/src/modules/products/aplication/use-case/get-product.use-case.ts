import { HttpException, Injectable } from '@nestjs/common';
import { Producto } from '../../domain/entities/product.entity';
import { ProductRepository } from '../../domain/repositories/product.respository';
import { CategoriaProducto } from '../../domain/enums/product.enum';
@Injectable()
export class GetProductoUseCase {
  constructor(private productoRepository: ProductRepository) {}

  async getAllProductos(): Promise<Producto[]> {
    try {
      const productos = await this.productoRepository.findAll();

      if (!productos.length) {
        throw new HttpException(
          {
            Error: 'No se encontraron productos',
          },
          404,
        );
      }
      return productos;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          Error: `Error al obtener los productos: ${(error as Error).message}`,
        },
        500,
      );
    }
  }

  async getByIdProducto(id: string): Promise<Producto> {
    try {
      const producto = await this.productoRepository.findById(id);

      if (!producto) {
        throw new HttpException({ Error: 'No se encontró el producto' }, 404);
      }

      return producto;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          Error: `Error al obtener el producto: ${(error as Error).message}`,
        },
        500,
      );
    }
  }

async getByCategoriaProducto(categoria: CategoriaProducto): Promise<Producto[]> {
    try {
      // Usamos el enum directamente como parámetro
      const productos = await this.productoRepository.findByCategory(categoria);

      // Verificamos si el arreglo está vacío
      if (!productos || productos.length === 0) {
        throw new HttpException(
          { Error: `No se encontraron productos para la categoría: ${categoria}` }, 
          404
        );
      }

      return productos;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          Error: `Error al obtener los productos por categoría: ${(error as Error).message}`,
        },
        500,
      );
    }
  }
}