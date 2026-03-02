import { IsNumber, IsInt, IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { TipoRecompensa } from '../../domain/enums/reward.enum'; // Ajusta la ruta si es necesario

export class CreateRecompensaDto {
  @IsString()
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsInt()
  costo_puntos: number;

  @IsEnum(TipoRecompensa)
  tipo: TipoRecompensa;

  @IsNumber()
  @IsOptional()
  valor_descuento?: number;

  @IsBoolean()
  @IsOptional()
  activa?: boolean;
}