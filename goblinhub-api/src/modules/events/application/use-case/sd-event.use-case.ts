import { ForbiddenException, HttpException, Injectable } from '@nestjs/common';
import { EventRepository } from '../../domain/repositories/event.repository';
import { Event } from '../../domain/entities/event.entity';
import { RolUsuario } from '../../../supabase/domain/enums/user.enum';
import { UsuarioRepository } from '../../../supabase/domain/repositories/usuario.repository';

@Injectable()
export class SoftDeleteEventUseCase {
  constructor(
    private eventRepository: EventRepository,
    private usuarios: UsuarioRepository,
  ) {}

  async softDeleteEvent(id: string, id_usuario: string): Promise<Event> {
    try {
      const event = await this.eventRepository.findById(id);

      if (!event) {
        throw new HttpException(
          {
            Error: `Event with id ${id} not found`,
          },
          404,
        );
      }

      const rol = await this.usuarios.findRolById(id_usuario);

      if (rol !== RolUsuario.admin) {
        throw new ForbiddenException(
          'Solo un administrador puede eliminar eventos',
        );
      }

      return this.eventRepository.delete(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          Error: 'An error occurred while soft deleting the event',
        },
        500,
      );
    }
  }
}
