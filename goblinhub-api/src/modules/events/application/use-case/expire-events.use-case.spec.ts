import { ExpireEventsUseCase } from './expire-events.use-case';
import { EventRepository } from '../../domain/repositories/event.repository';
import { Logger } from '@nestjs/common';

describe('ExpireEventsUseCase', () => {
  let useCase: ExpireEventsUseCase;
  let eventRepo: jest.Mocked<EventRepository>;

  beforeEach(() => {
    eventRepo = {
      expireEvents: jest.fn(),
    } as unknown as jest.Mocked<EventRepository>;
    useCase = new ExpireEventsUseCase(eventRepo);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe hacer log si hay eventos', async () => {
    eventRepo.expireEvents.mockResolvedValue(5);
    await useCase.expireAndSoftDeleteEvents();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(eventRepo.expireEvents).toHaveBeenCalledTimes(1);
  });

  it('no debe hacer log si es 0', async () => {
    eventRepo.expireEvents.mockResolvedValue(0);
    await useCase.expireAndSoftDeleteEvents();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(eventRepo.expireEvents).toHaveBeenCalledTimes(1);
  });
});
