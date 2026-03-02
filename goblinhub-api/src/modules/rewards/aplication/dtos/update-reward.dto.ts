import { IsNumber, IsInt, IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoRecompensa } from '../../domain/enums/reward.enum';

export class UpdateRecompensaDto {
  @ApiPropertyOptional({ example: 'Cupón de Descuento 20%' })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional({ example: 'Nueva descripción actualizada' })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiPropertyOptional({ example: 600 })
  @IsInt()
  @IsOptional()
  costo_puntos?: number;

  @ApiPropertyOptional({ enum: TipoRecompensa, example: 'DESCUENTO_FIJO' })
  @IsEnum(TipoRecompensa)
  @IsOptional()
  tipo?: TipoRecompensa;

  @ApiPropertyOptional({ example: 20.0 })
  @IsNumber()
  @IsOptional()
  valor_descuento?: number;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  activa?: boolean;
}