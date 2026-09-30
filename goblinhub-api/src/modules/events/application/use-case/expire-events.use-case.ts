import { Injectable, Logger } from '@nestjs/common';
import { EventRepository } from '../../domain/repositories/event.repository';

@Injectable()
export class ExpireEventsUseCase {
  private readonly logger = new Logger(ExpireEventsUseCase.name);

  /* istanbul ignore next */
  constructor(private readonly eventRepository: EventRepository) {}

  /**
   * Devuelve cuántos eventos se han caducado. El que llama necesita el número
   * para decidir si merece la pena dejar constancia en la auditoría: un cron
   * que corre cada minuto y no ha hecho nada no es una acción (#212).
   */
  async expireAndSoftDeleteEvents(): Promise<number> {
    const count: number = await this.eventRepository.expireEvents();

    if (count > 0) {
      this.logger.log(`Soft-deleted ${count} expired event(s).`);
    }

    return count;
  }
}
