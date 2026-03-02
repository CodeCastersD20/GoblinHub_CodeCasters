import { IsNumber, IsInt, IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { TipoRecompensa } from '../../domain/enums/reward.enum'; // Asegúrate de que el archivo del enum se llame así

export class UpdateRecompensaDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsInt()
  @IsOptional()
  costo_puntos?: number;

  @IsEnum(TipoRecompensa)
  @IsOptional()
  tipo?: TipoRecompensa;

  @IsNumber()
  @IsOptional()
  valor_descuento?: number;

  @IsBoolean()
  @IsOptional()
  activa?: boolean;
}