import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../connect/prisma.service';
import { Producto } from '../../domain/entities/product.entity';
import { CategoriaProductoMapper } from '../mappers/product-status.mapper';
import { ProductRepository } from '../../domain/repositories/product.respository';
import { CategoriaProducto } from '../../domain/enums/product.enum';
import { Producto as PrismaProducto } from '@prisma/client';

@Injectable()
export class ProductoPrismaRepository extends ProductRepository {
  constructor(private prisma: PrismaService) {
    super();
  }

  // --- Método Auxiliar para evitar repetir código ---
  private mapToDomain(prismaProducto: PrismaProducto): Producto {
    return new Producto(
      // Requeridos
      prismaProducto.id_producto,
      prismaProducto.nombre,
      CategoriaProductoMapper.toDomain(prismaProducto.categoria),
      prismaProducto.precio.toNumber(), // Convertimos el Decimal de Prisma a Number
      prismaProducto.stock,
      prismaProducto.stock_minimo,
      prismaProducto.popular,
      prismaProducto.es_nuevo,
      prismaProducto.activo,
      prismaProducto.created_at,
      prismaProducto.updated_at,
      // Opcionales
      prismaProducto.marca ?? undefined,
      prismaProducto.descripcion ?? undefined,
      prismaProducto.precio_original
        ? prismaProducto.precio_original.toNumber()
        : undefined,
      prismaProducto.imagen_url ?? undefined,
      prismaProducto.deleted_at ?? undefined,
      prismaProducto.id_creador ?? undefined,
    );
  }

  async create(producto: Producto, id_creador: string): Promise<Producto> {
    const created = await this.prisma.producto.create({
      data: {
        nombre: producto.nombre,
        marca: producto.marca,
        categoria: CategoriaProductoMapper.toPrisma(producto.categoria),
        descripcion: producto.descripcion,
        precio: producto.precio, // Prisma acepta Number al crear y lo convierte a Decimal
        precio_original: producto.precio_original,
        stock: producto.stock,
        stock_minimo: producto.stock_minimo,
        popular: producto.popular,
        es_nuevo: producto.es_nuevo,
        imagen_url: producto.imagen_url,
        activo: producto.activo,
        id_creador: id_creador,
      },
    });

    return this.mapToDomain(created);
  }

  async findAll(): Promise<Producto[]> {
    const productos = await this.prisma.producto.findMany({
      where: { deleted_at: null }, // Nota: Tu campo en Prisma tiene guion bajo
    });

    return productos.map((producto) => this.mapToDomain(producto));
  }

  async findById(id: string): Promise<Producto | null> {
    const producto = await this.prisma.producto.findFirst({
      where: { id_producto: id, deleted_at: null },
    });

    if (!producto) return null;

    return this.mapToDomain(producto);
  }

  async findByCategory(categoria: CategoriaProducto): Promise<Producto[]> {
    const productos = await this.prisma.producto.findMany({
      where: {
        categoria: CategoriaProductoMapper.toPrisma(categoria),
        deleted_at: null,
      },
    });

    return productos.map((producto) => this.mapToDomain(producto));
  }

  async update(id: string, productoData: Producto): Promise<Producto> {
    const updated = await this.prisma.producto.update({
      where: { id_producto: id },
      data: {
        nombre: productoData.nombre,
        marca: productoData.marca,
        categoria: CategoriaProductoMapper.toPrisma(productoData.categoria),
        descripcion: productoData.descripcion,
        precio: productoData.precio,
        precio_original: productoData.precio_original,
        stock: productoData.stock,
        stock_minimo: productoData.stock_minimo,
        popular: productoData.popular,
        es_nuevo: productoData.es_nuevo,
        imagen_url: productoData.imagen_url,
        activo: productoData.activo,
      },
    });

    return this.mapToDomain(updated);
  }
  async delete(id: string): Promise<void> {
    await this.prisma.producto.update({
      where: { id_producto: id },
      data: {
        deleted_at: new Date(),
        activo: false, // Opcional, pero recomendado para ocultarlo inmediatamente
      },
    });

    // Ya no hacemos return de mapToDomain porque el método es void (vacío)
  }
}
