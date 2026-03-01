import { ForbiddenException, HttpException, Injectable } from '@nestjs/common';
import { EventRepository } from '../../domain/repositories/event.repository';
import { UpdateEventDto } from '../dtos/update-event.dto';
import { Event } from '../../domain/entities/event.entity';
import { RolUsuario } from '../../../supabase/domain/enums/user.enum';
import { UsuarioRepository } from '../../../supabase/domain/repositories/usuario.repository';

@Injectable()
export class UpdateEventUseCase {
  constructor(
    private Event: EventRepository,
    private usuarios: UsuarioRepository,
  ) {}

  async updateEvent(
    id: string,
    data: UpdateEventDto,
    id_usuario: string,
  ): Promise<Event> {
    try {
      const existEvent = await this.Event.findById(id);

      if (!existEvent) {
        throw new HttpException(
          { Error: `Event with id ${id} not found` },
          404,
        );
      }

      const rol = await this.usuarios.findRolById(id_usuario);
      const isAdmin = rol === RolUsuario.admin;

      if (
        !isAdmin &&
        existEvent.id_creador &&
        existEvent.id_creador !== id_usuario
      ) {
        throw new ForbiddenException(
          'You do not have permission to update this event',
        );
      }

      if (data.titulo) {
        const existEvent = await this.Event.findByName(data.titulo);

        if (existEvent && existEvent.id !== id) {
          throw new HttpException(
            {
              Error: `Event already exists ${data.titulo}`,
            },
            400,
          );
        }
      }

      const updatedEvent = new Event(
        existEvent.id,
        data.titulo || existEvent.titulo,
        data.descripcion || existEvent.descripcion,
        data.tipo_evento || existEvent.tipo_evento,
        data.fecha || existEvent.fecha,
        data.hora_inicio || existEvent.hora_inicio,
        data.hora_fin || existEvent.hora_fin,
        data.lugar || existEvent.lugar,
        data.costo ?? existEvent.costo,
        data.cupo_maximo ?? existEvent.cupo_maximo,
        data.sistema_juego ?? existEvent.sistema_juego,
        data.puntos_premio_1 ?? existEvent.puntos_premio_1,
        data.puntos_premio_2 ?? existEvent.puntos_premio_2,
        data.puntos_premio_3 ?? existEvent.puntos_premio_3,
        data.puntos_participacion ?? existEvent.puntos_participacion,
      );
      return this.Event.update(id, updatedEvent);
    } catch (error) {
      if (
        error instanceof HttpException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new HttpException(
        {
          Error: 'An error occurred while updating the event',
        },
        500,
      );
    }
  }
}
