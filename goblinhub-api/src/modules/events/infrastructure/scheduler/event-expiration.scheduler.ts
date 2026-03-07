import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ExpireEventsUseCase } from '../../application/use-case/expire-events.use-case';

@Injectable()
export class EventExpirationScheduler {
  private readonly logger = new Logger(EventExpirationScheduler.name);

  constructor(private readonly expireEventsUseCase: ExpireEventsUseCase) {}

  // Runs every minute to check for events whose hora_fin (or hora_inicio) has passed
  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredEvents(): Promise<void> {
    this.logger.debug('Checking for expired events...');
    await this.expireEventsUseCase.expireAndSoftDeleteEvents();
  }
}
