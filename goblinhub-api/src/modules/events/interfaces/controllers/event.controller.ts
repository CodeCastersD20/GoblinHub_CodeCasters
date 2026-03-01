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
import { CreateEventUseCase } from '../../application/use-case/create-event.use-case';
import { UpdateEventUseCase } from '../../application/use-case/update-event.use-case';
import { SoftDeleteEventUseCase } from '../../application/use-case/sd-event.use-case';
import { GetEventUseCase } from '../../application/use-case/get-event.use-case';
import { Event } from '../../domain/entities/event.entity';
import { CreateEventDto } from '../../application/dtos/create-event.dto';
import { UpdateEventDto } from '../../application/dtos/update-event.dto';
import { SupabaseAuthGuard } from '../../../supabase/guard/supabse-auth.guard';
import type { AuthenticatedRequest } from '../../../supabase/interfaces/types/authenticated-request.interface';

@Controller('events')
export class EventController {
  constructor(
    private readonly get: GetEventUseCase,
    private readonly created: CreateEventUseCase,
    private readonly updated: UpdateEventUseCase,
    private readonly deleted: SoftDeleteEventUseCase,
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
    return await this.created.createEvent(createEventDto, req.user.id);
  }

  @Put(':id')
  @UseGuards(SupabaseAuthGuard)
  async updateEvent(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<Event> {
    if (!req.user) throw new UnauthorizedException('User not authenticated');
    return await this.updated.updateEvent(id, updateEventDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(SupabaseAuthGuard)
  async deleteEvent(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<Event> {
    if (!req.user) throw new UnauthorizedException('User not authenticated');
    return await this.deleted.softDeleteEvent(id, req.user.id);
  }
}
