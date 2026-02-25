import { ForbiddenException, HttpException, Injectable } from '@nestjs/common';
import { EventRepository } from '../../domain/repositories/event.repository';
import { CreateEventDto } from '../dtos/create-event.dto';
import { Event } from '../../domain/entities/event.entity';
import { EventValidationStatus } from '../../domain/enums/event.enum';
import { RolUsuario } from '../../../supabase/domain/enums/user.enum';
import { UsuarioRepository } from '../../../supabase/domain/repositories/usuario.repository';

@Injectable()
export class CreateEventUseCase {
  constructor(
    private Event: EventRepository,
    private usuarios: UsuarioRepository,
  ) {}

  async createEvent(data: CreateEventDto, id_creador: string): Promise<Event> {
    try {
      const rol = await this.usuarios.findRolById(id_creador);

      if (rol !== RolUsuario.admin && rol !== RolUsuario.empleado) {
        throw new ForbiddenException(
          'You do not have permission to create events',
        );
      }
      const existEvent = await this.Event.findByName(data.titulo);

      if (existEvent) {
        throw new HttpException(
          {
            Error: `Event already exists ${data.titulo}`,
          },
          400,
        );
      }

      const isValidValidationStatus = Object.values(
        EventValidationStatus,
      ).includes(data.tipo_evento);

      if (!isValidValidationStatus) {
        throw new HttpException(
          {
            Error: `Invalid validation status ${data.tipo_evento}`,
          },
          400,
        );
      }

      const event = new Event(
        '',
        data.titulo,
        data.descripcion,
        data.tipo_evento,
        data.fecha,
        data.hora_inicio,
        data.hora_fin,
        data.lugar,
        data.costo,
        data.cupo_maximo,
        data.sistema_juego,
        data.puntos_premio_1,
        data.puntos_premio_2,
        data.puntos_premio_3,
        data.puntos_participacion,
      );
      return this.Event.create(event, id_creador);
    } catch (error) {
      if (
        error instanceof HttpException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new HttpException(
        {
          Error: 'An error occurred while creating the event',
          detail: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  }
}
