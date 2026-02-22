import { HttpException, Injectable } from '@nestjs/common';
import { EventRepository } from '../../domain/repositories/event.repository';
import { Event } from '../../domain/entities/event.entity';

@Injectable()
export class softDeletedEventUseCase {
  constructor(private Event: EventRepository) {}

  async softDeleteEvent(id: string): Promise<Event> {
    try {
      const event = await this.Event.findById(id);

      if (!event) {
        throw new HttpException(
          {
            Error: `Event with id ${id} not found`,
          },
          404,
        );
      }

      return this.Event.delete(id);
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
