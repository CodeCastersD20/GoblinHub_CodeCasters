import {
  IsNumber,
  IsInt,
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoRecompensa } from '../../domain/enums/reward.enum';

export class CreateRecompensaDto {
  @ApiProperty({ example: 'Cupón de Descuento 15%' })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({ example: 'Válido para todas las pinturas Citadel' })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ example: 500, description: 'Costo en puntos de fidelidad' })
  @IsInt()
  costo_puntos: number;

  @ApiProperty({ enum: TipoRecompensa, example: 'DESCUENTO_PORCENTAJE' })
  @IsEnum(TipoRecompensa)
  tipo: TipoRecompensa;

  @ApiPropertyOptional({
    example: 15.0,
    description: 'Valor del descuento si aplica',
  })
  @IsNumber()
  @IsOptional()
  valor_descuento?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  activa?: boolean;
}
