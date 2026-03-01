import { IsNumber, IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { CategoriaProducto } from '../../domain/enums/product.enum';

export class CreateProductoDto {
  @IsString()
  nombre: string;

  @IsString()
  @IsOptional()
  marca?: string;

  @IsEnum(CategoriaProducto)
  categoria: CategoriaProducto;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsNumber()
  precio: number;

  @IsNumber()
  @IsOptional()
  precio_original?: number;

  @IsNumber()
  @IsOptional()
  stock?: number;

  @IsNumber()
  @IsOptional()
  stock_minimo?: number;

  @IsBoolean()
  @IsOptional()
  popular?: boolean;

  @IsBoolean()
  @IsOptional()
  es_nuevo?: boolean;

  @IsString()
  @IsOptional()
  imagen_url?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}