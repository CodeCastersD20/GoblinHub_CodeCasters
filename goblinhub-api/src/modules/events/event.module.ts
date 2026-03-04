import { Module } from '@nestjs/common';
import { EventController } from './interfaces/controllers/event.controller';
import { CreateEventUseCase } from './application/use-case/create-event.use-case';
import { UpdateEventUseCase } from './application/use-case/update-event.use-case';
import { SoftDeleteEventUseCase } from './application/use-case/sd-event.use-case';
import { GetEventUseCase } from './application/use-case/get-event.use-case';
import { ExpireEventsUseCase } from './application/use-case/expire-events.use-case';
import { EventRepository } from './domain/repositories/event.repository';
import { EventRepositoryPrisma } from './infrastructure/prisma/event.repository';
import { EventExpirationScheduler } from './infrastructure/scheduler/event-expiration.scheduler';
import { PrismaModule } from '../../connect/prisma.module';
import { SupabaseAuthModule } from '../supabase/supabase-auth.module';

@Module({
  controllers: [EventController],
  providers: [
    CreateEventUseCase,
    UpdateEventUseCase,
    SoftDeleteEventUseCase,
    GetEventUseCase,
    ExpireEventsUseCase,
    EventExpirationScheduler,
    {
      provide: EventRepository,
      useClass: EventRepositoryPrisma,
    },
  ],
  imports: [PrismaModule, SupabaseAuthModule],
})
export class EventModule {}
