import { HttpException, Injectable } from "@nestjs/common";
import { ProductRepository } from "../../domain/repositories/product.respository";
import { Producto } from "../../domain/entities/product.entity";

@Injectable()
export class SoftDeleteProductoUseCase {
  constructor(private productoRepository: ProductRepository) {}

  async softDeleteProducto(id: string): Promise<void> {
    try {
      // 1. Verificamos que el producto realmente exista
      const productoExistente = await this.productoRepository.findById(id);

      if (!productoExistente) {
        throw new HttpException({ Error: 'No se encontró el producto a eliminar' }, 404);
      }

      // 2. Si existe, procedemos a hacer el soft delete
      await this.productoRepository.delete(id);
      
    } catch (error) {
      if (error instanceof HttpException) {
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