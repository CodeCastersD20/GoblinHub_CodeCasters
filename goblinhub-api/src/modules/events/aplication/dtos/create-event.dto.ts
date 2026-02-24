import {
  EventStatus,
  EventValidationStatus,
} from '../../domain/enums/event.enum';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsEnum(EventValidationStatus)
  tipo_evento: EventValidationStatus;

  @IsDateString({ strict: true })
  @IsNotEmpty()
  fecha: string;

  @IsString()
  @IsNotEmpty()
  hora_inicio: string;

  @IsOptional()
  @IsString()
  hora_fin?: string;

  @IsString()
  @IsNotEmpty()
  lugar: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
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
