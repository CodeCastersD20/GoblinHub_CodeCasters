import { Producto } from "../entities/product.entity";

export abstract class ProductRepository {
    abstract create(product: Producto): Promise<Producto>;
    abstract findById(id: string): Promise<Producto | null>;
    abstract findAll(): Promise<Producto[]>;
    abstract findByCategory(category: string): Promise<Producto[]>;
    abstract update(id: string, product: Partial<Producto>): Promise<Producto>;
    abstract delete(id: string): Promise<void>;
}