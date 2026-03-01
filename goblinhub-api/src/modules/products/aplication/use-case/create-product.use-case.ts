import { HttpException, Injectable } from "@nestjs/common";
import { ProductRepository } from '../../domain/repositories/product.respository'
import { CreateProductoDto } from "../dtos/create-product.dtos";
import { Producto } from "../../domain/entities/product.entity";

@Injectable()
export class CreateProductoUseCase {
  constructor(private productoRepository: ProductRepository) {}

  async createProducto(data: CreateProductoDto): Promise<Producto> {
    try {
      // 1. Construimos la entidad directamente sin buscar duplicados
      const newProducto = new Producto(
        "", // El ID vacío. Prisma generará el UUID automáticamente al guardar.
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
        data.imagen_url
      );

      // 2. Guardamos en la base de datos
      return await this.productoRepository.create(newProducto);
      
    } catch (error) {
      if (error instanceof HttpException) {
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