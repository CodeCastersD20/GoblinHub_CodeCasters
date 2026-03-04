import { CategoriaProducto as DomainCategoriaProducto } from '../../domain/enums/product.enum';
import { CategoriaProducto as PrismaCategoriaProducto } from '@prisma/client';

const domainToPrismaMap: Record<
  DomainCategoriaProducto,
  PrismaCategoriaProducto
> = {
  [DomainCategoriaProducto.WARGAMES]: PrismaCategoriaProducto.wargames,
  [DomainCategoriaProducto.ROL]: PrismaCategoriaProducto.rol,
  [DomainCategoriaProducto.MESA]: PrismaCategoriaProducto.mesa,
  [DomainCategoriaProducto.PINTURA]: PrismaCategoriaProducto.pintura,
  [DomainCategoriaProducto.ACCESORIOS]: PrismaCategoriaProducto.accesorios,
};

const prismaToDomainMap: Record<
  PrismaCategoriaProducto,
  DomainCategoriaProducto
> = {
  [PrismaCategoriaProducto.wargames]: DomainCategoriaProducto.WARGAMES,
  [PrismaCategoriaProducto.rol]: DomainCategoriaProducto.ROL,
  [PrismaCategoriaProducto.mesa]: DomainCategoriaProducto.MESA,
  [PrismaCategoriaProducto.pintura]: DomainCategoriaProducto.PINTURA,
  [PrismaCategoriaProducto.accesorios]: DomainCategoriaProducto.ACCESORIOS,
};

export class CategoriaProductoMapper {
  static toPrisma(categoria: DomainCategoriaProducto): PrismaCategoriaProducto {
    return domainToPrismaMap[categoria];
  }

  static toDomain(categoria: PrismaCategoriaProducto): DomainCategoriaProducto {
    return prismaToDomainMap[categoria];
  }
}
