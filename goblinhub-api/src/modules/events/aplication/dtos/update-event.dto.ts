import {
  EventValidationStatus,
  EventStatus,
} from '../../domain/enums/event.enum';
import {
  IsOptional,
  IsEnum,
  IsString,
  IsDateString,
  Min,
  IsNumber,
} from 'class-validator';

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  titulo: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsEnum(EventValidationStatus)
  tipo_evento: EventValidationStatus;

  @IsOptional()
  @IsDateString({ strict: true })
  fecha: string;

  @IsOptional()
  @IsString()
  hora_inicio: string;

  @IsOptional()
  @IsString()
  hora_fin?: string;

  @IsOptional()
  @IsString()
  lugar: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costo?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  cupo_maximo: number;

  @IsOptional()
  @IsEnum(EventStatus)
  estado: EventStatus;

  @IsOptional()
  @IsString()
  sistema_juego?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  puntos_premio_1?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  puntos_premio_2?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  puntos_premio_3?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  puntos_participacion?: number;
}
