import { Module } from '@nestjs/common';
import { EventController } from './interfaces/controllers/event.controller';
import { CreateEventUseCase } from './aplication/use-case/create-event.use-case';
import { UpdateEventUseCase } from './aplication/use-case/update-event.use-case';
import { softDeletedEventUseCase } from './aplication/use-case/sd-event.use-case';
import { getEventUseCase } from './aplication/use-case/get-event.use-case';
import { EventRepository } from './domain/repositories/event.repository';
import { EventRepositoryPrisma } from './infrastructure/prisma/event.repository';
import { PrismaModule } from 'src/connect/prisma.module';

@Module({
  controllers: [EventController],
  providers: [
    CreateEventUseCase,
    UpdateEventUseCase,
    softDeletedEventUseCase,
    getEventUseCase,
    {
      provide: EventRepository,
      useClass: EventRepositoryPrisma,
    },
  ],
  imports: [PrismaModule],
})
export class EventModule {}
