import { CategoriaProducto } from '../enums/product.enum';

export class Producto {
  constructor(
    // --- Requeridos ---
    public id_producto: string,
    public nombre: string,
    public categoria: CategoriaProducto,
    public precio: number,
    public stock: number,
    public stock_minimo: number,
    public popular: boolean,
    public es_nuevo: boolean,
    public activo: boolean,
    public created_at: Date,
    public updated_at: Date,

    // --- Opcionales (siempre al final) ---
    public marca?: string,
    public descripcion?: string,
    public precio_original?: number,
    public imagen_url?: string,
    public deleted_at?: Date,
  ) {}
}
