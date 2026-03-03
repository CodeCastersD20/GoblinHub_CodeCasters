import { HttpException, Injectable } from '@nestjs/common';
import { EventRepository } from '../../domain/repositories/event.repository';
import { Event } from '../../domain/entities/event.entity';

@Injectable()
export class GetEventUseCase {
  constructor(private eventRepository: EventRepository) {}

  async getAllEvents(): Promise<Event[]> {
    try {
      const events = await this.eventRepository.findAll();

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

  async getEventById(id: string): Promise<Event> {
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
      const event = await this.eventRepository.findByName(name);

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

  async searchEventsByName(name: string): Promise<Event[]> {
    try {
      const events = await this.eventRepository.searchByName(name);

      if (!events || events.length === 0) {
        throw new HttpException(
          {
            Error: `No events found matching '${name}'`,
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
          Error: 'An error occurred while searching events',
        },
        500,
      );
    }
  }
}
