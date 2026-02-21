import { HttpException, Injectable } from '@nestjs/common';
import { EventRepository } from '../../domain/repositories/event.repository';
import { Event } from '../../domain/entities/event.entity';

@Injectable()
export class getEventUseCase {
  constructor(private Event: EventRepository) {}

  async getAllEvents(): Promise<Event[]> {
    try {
      const events = await this.Event.findAll();

      if (!events || events.length === 0) {
        throw new HttpException(
          {
            Error: 'No events found',
          },
          404,
        );
      }
      return events;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          Error: 'An error occurred while retrieving events',
        },
        500,
      );
    }
  }

  async getEventById(id: number): Promise<Event> {
    try {
      const event = await this.Event.findById(id.toString());

      if (!event) {
        throw new HttpException(
          {
            Error: `Event with id ${id} not found`,
          },
          404,
        );
      }

      return event;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          Error: 'An error occurred while retrieving the event',
        },
        500,
      );
    }
  }

  async getEventByName(name: string): Promise<Event> {
    try {
      const event = await this.Event.findByName(name);

      if (!event) {
        throw new HttpException(
          {
            Error: `Event with name ${name} not found`,
          },
          404,
        );
      }

      return event;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          Error: 'An error occurred while retrieving the event',
        },
        500,
      );
    }
  }
}
