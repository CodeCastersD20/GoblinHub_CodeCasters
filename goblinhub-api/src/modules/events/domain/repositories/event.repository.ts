import { Event } from '../entities/event.entity';

export abstract class EventRepository {
  abstract create(event: Event, id_creador: string): Promise<Event>;
  abstract findAll(): Promise<Event[]>;
  abstract findById(id: string): Promise<Event | null>;
  abstract findByName(name: string): Promise<Event | null>;
  abstract searchByName(name: string): Promise<Event[]>;
  abstract update(id: string, event: Event): Promise<Event>;
  abstract delete(id: string): Promise<Event>;
  abstract expireEvents(): Promise<number>;
}
