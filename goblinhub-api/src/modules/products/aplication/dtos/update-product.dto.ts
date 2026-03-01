import { IsNumber, IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { CategoriaProducto } from '../../domain/enums/product.enum';

export class UpdateProductoDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  marca?: string;

  @IsEnum(CategoriaProducto)
  @IsOptional()
  categoria?: CategoriaProducto;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsNumber()
  @IsOptional()
  precio?: number;

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