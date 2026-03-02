import { CategoriaProducto as DomainCategoriaProducto } from '../../domain/enums/product.enum';
import { CategoriaProducto as PrismaCategoriaProducto } from '@prisma/client';

export class CategoriaProductoMapper {
  static toPrisma(
    categoria: DomainCategoriaProducto,
  ): PrismaCategoriaProducto {
    // Lo pasamos a minúsculas porque Prisma lo espera así (ej: "WARGAMES" -> "wargames")
    return categoria.toLowerCase() as unknown as PrismaCategoriaProducto;
  }

  static toDomain(
    categoria: PrismaCategoriaProducto,
  ): DomainCategoriaProducto {
    // Lo regresamos a mayúsculas para que cumpla con tu lógica de negocio
    return categoria.toUpperCase() as unknown as DomainCategoriaProducto;
  }
}