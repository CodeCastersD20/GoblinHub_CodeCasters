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
import { ApiPropertyOptional } from '@nestjs/swagger'; // Solo necesitamos el opcional aquí

export class UpdateEventDto {
  @ApiPropertyOptional({ example: 'Torneo Relámpago (Editado)', description: 'Nuevo título del evento' })
  @IsOptional()
  @IsString()
  titulo: string;

  @ApiPropertyOptional({ example: 'Descripción actualizada del torneo.', description: 'Nueva descripción' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ 
    enum: EventValidationStatus, 
    example: 'COMPETITIVO',
    description: 'Cambiar el nivel de validación'
  })
  @IsOptional()
  @IsEnum(EventValidationStatus)
  tipo_evento: EventValidationStatus;

  @ApiPropertyOptional({ example: '2026-05-20', description: 'Nueva fecha (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({ strict: true })
  fecha: string;

  @ApiPropertyOptional({ example: '11:00', description: 'Nueva hora de inicio' })
  @IsOptional()
  @IsString()
  hora_inicio: string;

  @ApiPropertyOptional({ example: '19:00', description: 'Nueva hora de fin' })
  @IsOptional()
  @IsString()
  hora_fin?: string;

  @ApiPropertyOptional({ example: 'Sede Norte GoblinHub', description: 'Nueva ubicación' })
  @IsOptional()
  @IsString()
  lugar: string;

  @ApiPropertyOptional({ example: 20.00, description: 'Nuevo costo' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costo?: number;

  @ApiPropertyOptional({ example: 40, description: 'Nuevo cupo máximo' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  cupo_maximo: number;

  @ApiPropertyOptional({ 
    enum: EventStatus, 
    example: 'finalizado',
    description: 'Cambiar el estado del evento'
  })
  @IsOptional()
  @IsEnum(EventStatus)
  estado: EventStatus;

  @ApiPropertyOptional({ example: 'Kill Team', description: 'Cambiar sistema de juego' })
  @IsOptional()
  @IsString()
  sistema_juego?: string;

  @ApiPropertyOptional({ example: 150 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  puntos_premio_1?: number;

  @ApiPropertyOptional({ example: 75 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  puntos_premio_2?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  puntos_premio_3?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  puntos_participacion?: number;
}