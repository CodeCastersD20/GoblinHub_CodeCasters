import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CreateEventUseCase } from '../../aplication/use-case/create-event.use-case';
import { UpdateEventUseCase } from '../../aplication/use-case/update-event.use-case';
import { softDeletedEventUseCase } from '../../aplication/use-case/sd-event.use-case';
import { getEventUseCase } from '../../aplication/use-case/get-event.use-case';
import { Event } from '../../domain/entities/event.entity';
import { CreateEventDto } from '../../aplication/dtos/create-event.dto';
import { UpdateEventDto } from '../../aplication/dtos/update-event.dto';

@Controller('events')
export class EventController {
  constructor(
    private readonly get: getEventUseCase,
    private readonly created: CreateEventUseCase,
    private readonly updated: UpdateEventUseCase,
    private readonly deleted: softDeletedEventUseCase,
  ) {}

  @Get()
  async getAll(): Promise<Event[]> {
    return await this.get.getAllEvents();
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<Event> {
    return await this.get.getEventById(id);
  }

  @Post()
  async createEvent(@Body() createEventDto: CreateEventDto): Promise<Event> {
    // TODO: Extraer id_creador del JWT cuando implementes autenticación
    const id_creador = 'temp-user-id'; // Temporal
    return await this.created.createEvent(createEventDto, id_creador);
  }

  @Put(':id')
  async updateEvent(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
  ): Promise<Event> {
    return await this.updated.updateEvent(id, updateEventDto);
  }

  @Delete(':id')
  async deleteEvent(@Param('id') id: string): Promise<Event> {
    return await this.deleted.softDeleteEvent(id);
  }
}
