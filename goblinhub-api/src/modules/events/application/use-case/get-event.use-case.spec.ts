import { GetEventUseCase } from './get-event.use-case';
import { EventRepository } from '../../domain/repositories/event.repository';
import { HttpException } from '@nestjs/common';
import { Event } from '../../domain/entities/event.entity';
import { EventValidationStatus } from '../../domain/enums/event.enum';

describe('getEventUseCase', () => {
  let useCase: GetEventUseCase;
  let eventRepo: jest.Mocked<EventRepository>;

  const mockEvent = new Event(
    '1',
    'Torneo Warhammer 40K',
    undefined,
    EventValidationStatus.torneo,
    '2026-04-15',
    '10:00',
    undefined,
    'Tienda',
    undefined,
    20,
  );

  beforeEach(() => {
    eventRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      searchByName: jest.fn(),
    } as unknown as jest.Mocked<EventRepository>;

    useCase = new GetEventUseCase(eventRepo);
  });

  describe('getAllEvents', () => {
    it('debe retornar eventos', async () => {
      eventRepo.findAll.mockResolvedValue([mockEvent]);
      expect(await useCase.getAllEvents()).toEqual([mockEvent]);
    });

    it('debe lanzar 404 si no hay eventos', async () => {
      eventRepo.findAll.mockResolvedValue([]);
      await expect(useCase.getAllEvents()).rejects.toThrow(HttpException);
    });

    it('debe lanzar 500 si falla el repo', async () => {
      eventRepo.findAll.mockRejectedValue(new Error());
      await expect(useCase.getAllEvents()).rejects.toThrow(HttpException);
    });
  });

  describe('getEventById', () => {
    it('debe retornar el evento por ID', async () => {
      eventRepo.findById.mockResolvedValue(mockEvent);
      expect(await useCase.getEventById('1')).toEqual(mockEvent);
    });

    it('debe lanzar 404 si no existe', async () => {
      eventRepo.findById.mockResolvedValue(null);
      await expect(useCase.getEventById('1')).rejects.toThrow(HttpException);
    });

    it('debe lanzar 500 si falla el repo', async () => {
      eventRepo.findById.mockRejectedValue(new Error());
      await expect(useCase.getEventById('1')).rejects.toThrow(HttpException);
    });
  });

  describe('getEventByName', () => {
    it('debe retornar el evento por nombre', async () => {
      eventRepo.findByName.mockResolvedValue(mockEvent);
      expect(await useCase.getEventByName('Warhammer')).toEqual(mockEvent);
    });

    it('debe lanzar 404 si no existe', async () => {
      eventRepo.findByName.mockResolvedValue(null);
      await expect(useCase.getEventByName('Nadie')).rejects.toThrow(
        HttpException,
      );
    });

    it('debe lanzar 500 si falla el repo', async () => {
      eventRepo.findByName.mockRejectedValue(new Error());
      await expect(useCase.getEventByName('Error')).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('searchEventsByName', () => {
    it('debe buscar y retornar eventos', async () => {
      eventRepo.searchByName.mockResolvedValue([mockEvent]);
      expect(await useCase.searchEventsByName('War')).toEqual([mockEvent]);
    });

    it('debe lanzar 404 si no hay coincidencias', async () => {
      eventRepo.searchByName.mockResolvedValue([]);
      await expect(useCase.searchEventsByName('Nadie')).rejects.toThrow(
        HttpException,
      );
    });

    it('debe lanzar 500 si falla el repo', async () => {
      eventRepo.searchByName.mockRejectedValue(new Error());
      await expect(useCase.searchEventsByName('Error')).rejects.toThrow(
        HttpException,
      );
    });
  });
});
