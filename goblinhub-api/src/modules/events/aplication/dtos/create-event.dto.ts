import {
  EventStatus,
  EventValidationStatus,
} from '../../domain/enums/event.enum';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsDecimal,
  Min,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  titulo: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsEnum(EventValidationStatus)
  tipo_evento: EventValidationStatus;

  @IsDateString()
  fecha: string;

  @IsString()
  hora_inicio: string;

  @IsOptional()
  @IsString()
  hora_fin?: string;

  @IsString()
  lugar: string;

  @IsOptional()
  @IsDecimal()
  costo?: number;

  @IsNumber()
  @Min(1)
  cupo_maximo: number;

  @IsOptional()
  @IsEnum(EventStatus)
  estado: EventStatus;

  @IsOptional()
  @IsString()
  sistema_juego?: string;

  @IsNumber()
  puntos_premio_1?: number;

  @IsNumber()
  puntos_premio_2?: number;

  @IsNumber()
  puntos_premio_3?: number;

  @IsNumber()
  puntos_participacion?: number;
}
