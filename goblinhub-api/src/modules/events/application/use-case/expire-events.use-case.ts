import { Injectable, Logger } from '@nestjs/common';
import { EventRepository } from '../../domain/repositories/event.repository';

@Injectable()
export class ExpireEventsUseCase {
  private readonly logger = new Logger(ExpireEventsUseCase.name);

  constructor(private readonly eventRepository: EventRepository) {}

  async expireAndSoftDeleteEvents(): Promise<void> {
    const count: number = await this.eventRepository.expireEvents();

    if (count > 0) {
      this.logger.log(`Soft-deleted ${count} expired event(s).`);
    }
  }
}
