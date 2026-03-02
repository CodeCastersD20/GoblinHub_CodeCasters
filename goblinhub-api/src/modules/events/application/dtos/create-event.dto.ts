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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty({ example: 'Torneo Relámpago de Warhammer', description: 'Título del evento' })
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @ApiPropertyOptional({ example: 'Un evento para novatos y veteranos por igual.', description: 'Descripción detallada' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ 
    enum: EventValidationStatus, 
    example: 'CASUAL', // Usamos string directo para evitar el error de "Property does not exist"
    description: 'Nivel de validación o tipo de competencia'
  })
  @IsEnum(EventValidationStatus)
  tipo_evento: EventValidationStatus;

  @ApiProperty({ example: '2026-04-15', description: 'Fecha del evento (YYYY-MM-DD)' })
  @IsDateString({ strict: true })
  @IsNotEmpty()
  fecha: string;

  @ApiProperty({ example: '10:00', description: 'Hora de inicio' })
  @IsString()
  @IsNotEmpty()
  hora_inicio: string;

  @ApiPropertyOptional({ example: '18:00', description: 'Hora estimada de finalización' })
  @IsOptional()
  @IsString()
  hora_fin?: string;

  @ApiProperty({ example: 'GoblinHub Local Central', description: 'Ubicación física del evento' })
  @IsString()
  @IsNotEmpty()
  lugar: string;

  @ApiPropertyOptional({ example: 15.50, description: 'Costo de inscripción', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costo?: number;

  @ApiProperty({ example: 32, description: 'Capacidad máxima de asistentes', minimum: 1 })
  @IsNumber()
  @Min(1)
  cupo_maximo: number;

  @ApiPropertyOptional({ 
    enum: EventStatus, 
    example: 'programado', // Cambiado a string directo
    default: 'programado' 
  })
  @IsOptional()
  @IsEnum(EventStatus)
  estado: EventStatus;

  @ApiPropertyOptional({ example: 'Warhammer 40k', description: 'El juego que se usará' })
  @IsOptional()
  @IsString()
  sistema_juego?: string;

  @ApiPropertyOptional({ example: 100, description: 'Puntos para el 1er lugar' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  puntos_premio_1?: number;

  @ApiPropertyOptional({ example: 50, description: 'Puntos para el 2do lugar' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  puntos_premio_2?: number;

  @ApiPropertyOptional({ example: 25, description: 'Puntos para el 3er lugar' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  puntos_premio_3?: number;

  @ApiPropertyOptional({ example: 10, description: 'Puntos solo por asistir' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  puntos_participacion?: number;
}