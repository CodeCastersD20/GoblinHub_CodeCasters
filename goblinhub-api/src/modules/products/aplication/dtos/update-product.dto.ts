import { IsNumber, IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger'; // Decorador para campos opcionales
import { CategoriaProducto } from '../../domain/enums/product.enum';

export class UpdateProductoDto {
  @ApiPropertyOptional({ example: 'Pintura Citadel: Mephiston Red (Actualizado)', description: 'Nuevo nombre' })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional({ example: 'Citadel Colors', description: 'Nueva marca' })
  @IsString()
  @IsOptional()
  marca?: string;

  @ApiPropertyOptional({ 
    enum: CategoriaProducto, 
    example: 'PINTURA',
    description: 'Nueva categoría del producto' 
  })
  @IsEnum(CategoriaProducto)
  @IsOptional()
  categoria?: CategoriaProducto;

  @ApiPropertyOptional({ example: 'Nueva descripción para este producto.', description: 'Nueva descripción' })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiPropertyOptional({ example: 4.99, description: 'Nuevo precio de venta' })
  @IsNumber()
  @IsOptional()
  precio?: number;

  @ApiPropertyOptional({ example: 5.50, description: 'Nuevo precio original' })
  @IsNumber()
  @IsOptional()
  precio_original?: number;

  @ApiPropertyOptional({ example: 100, description: 'Actualizar stock disponible' })
  @IsNumber()
  @IsOptional()
  stock?: number;

  @ApiPropertyOptional({ example: 10, description: 'Actualizar stock mínimo' })
  @IsNumber()
  @IsOptional()
  stock_minimo?: number;

  @ApiPropertyOptional({ example: false, description: 'Marcar como popular o no' })
  @IsBoolean()
  @IsOptional()
  popular?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Quitar etiqueta de nuevo' })
  @IsBoolean()
  @IsOptional()
  es_nuevo?: boolean;

  @ApiPropertyOptional({ example: 'https://cdn.myminis.com/new-image.jpg', description: 'Nueva URL de imagen' })
  @IsString()
  @IsOptional()
  imagen_url?: string;

  @ApiPropertyOptional({ example: true, description: 'Habilitar o deshabilitar producto' })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
