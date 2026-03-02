import { IsNumber, IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'; // Importamos Swagger
import { CategoriaProducto } from '../../domain/enums/product.enum';

export class CreateProductoDto {
  @ApiProperty({ example: 'Pintura Citadel: Mephiston Red', description: 'Nombre del producto' })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({ example: 'Citadel', description: 'Marca o fabricante' })
  @IsString()
  @IsOptional()
  marca?: string;

  @ApiProperty({ 
    enum: CategoriaProducto, 
    example: CategoriaProducto.PINTURA,
    description: 'Categoría del producto según el Enum'
  })
  @IsEnum(CategoriaProducto)
  categoria: CategoriaProducto;

  @ApiPropertyOptional({ example: 'Pintura base acrílica de alta calidad', description: 'Descripción detallada' })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ example: 4.50, description: 'Precio de venta actual' })
  @IsNumber()
  precio: number;

  @ApiPropertyOptional({ example: 5.00, description: 'Precio sin descuento' })
  @IsNumber()
  @IsOptional()
  precio_original?: number;

  @ApiPropertyOptional({ example: 50, default: 0 })
  @IsNumber()
  @IsOptional()
  stock?: number;

  @ApiPropertyOptional({ example: 5, default: 2 })
  @IsNumber()
  @IsOptional()
  stock_minimo?: number;

  @ApiPropertyOptional({ example: true, default: false })
  @IsBoolean()
  @IsOptional()
  popular?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  es_nuevo?: boolean;

  @ApiPropertyOptional({ 
    example: 'https://myminis.com/image.jpg', 
    description: 'URL de la imagen del producto' 
  })
  @IsString()
  @IsOptional()
  imagen_url?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}