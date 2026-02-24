import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { CreateEventUseCase } from '../../aplication/use-case/create-event.use-case';
import { UpdateEventUseCase } from '../../aplication/use-case/update-event.use-case';
import { softDeletedEventUseCase } from '../../aplication/use-case/sd-event.use-case';
import { getEventUseCase } from '../../aplication/use-case/get-event.use-case';
import { Event } from '../../domain/entities/event.entity';
import { CreateEventDto } from '../../aplication/dtos/create-event.dto';
import { UpdateEventDto } from '../../aplication/dtos/update-event.dto';
import { SupabaseAuthGuard } from '../../../supabase/guard/supabse-auth.guard';
import type { AuthenticatedRequest } from '../../../supabase/interfaces/types/authenticated-request.interface';

@Controller('events')
export class EventController {
  constructor(
    private readonly get: getEventUseCase,
    private readonly created: CreateEventUseCase,
    private readonly updated: UpdateEventUseCase,
    private readonly deleted: softDeletedEventUseCase,
  ) {}

  @Get()
  async getAll(@Query('name') name?: string): Promise<Event[]> {
    if (name) return await this.get.searchEventsByName(name);
    return await this.get.getAllEvents();
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<Event> {
    return await this.get.getEventById(id);
  }

  @Post()
  @UseGuards(SupabaseAuthGuard)
  async createEvent(
    @Body() createEventDto: CreateEventDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<Event> {
    if (!req.user) throw new UnauthorizedException('User not authenticated');
    const id_creador = req.user.id;
    return await this.created.createEvent(createEventDto, id_creador);
  }

  @Put(':id')
  @UseGuards(SupabaseAuthGuard)
  async updateEvent(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
  ): Promise<Event> {
    return await this.updated.updateEvent(id, updateEventDto);
  }

  @Delete(':id')
  @UseGuards(SupabaseAuthGuard)
  async deleteEvent(@Param('id') id: string): Promise<Event> {
    return await this.deleted.softDeleteEvent(id);
  }
}
