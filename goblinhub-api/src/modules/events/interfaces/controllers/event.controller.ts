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
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiQuery, 
  ApiBearerAuth 
} from '@nestjs/swagger'; // Swagger tools
import { CreateEventUseCase } from '../../aplication/use-case/create-event.use-case';
import { UpdateEventUseCase } from '../../aplication/use-case/update-event.use-case';
import { softDeletedEventUseCase } from '../../aplication/use-case/sd-event.use-case';
import { getEventUseCase } from '../../aplication/use-case/get-event.use-case';
import { Event } from '../../domain/entities/event.entity';
import { CreateEventDto } from '../../aplication/dtos/create-event.dto';
import { UpdateEventDto } from '../../aplication/dtos/update-event.dto';
import { SupabaseAuthGuard } from '../../../supabase/guard/supabse-auth.guard';
import type { AuthenticatedRequest } from '../../../supabase/interfaces/types/authenticated-request.interface';

@ApiTags('events') // Requerido por el issue
@Controller('events')
export class EventController {
  constructor(
    private readonly get: getEventUseCase,
    private readonly created: CreateEventUseCase,
    private readonly updated: UpdateEventUseCase,
    private readonly deleted: softDeletedEventUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los eventos o buscar por nombre (Público)' })
  @ApiQuery({ name: 'name', required: false, description: 'Filtrar eventos por nombre' })
  @ApiResponse({ status: 200, description: 'Lista de eventos obtenida con éxito.' })
  async getAll(@Query('name') name?: string): Promise<Event[]> {
    if (name) return await this.get.searchEventsByName(name);
    return await this.get.getAllEvents();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un evento por ID (Público)' })
  @ApiParam({ name: 'id', description: 'UUID del evento' })
  @ApiResponse({ status: 200, description: 'Evento encontrado.' })
  @ApiResponse({ status: 404, description: 'Evento no encontrado.' })
  async getById(@Param('id') id: string): Promise<Event> {
    return await this.get.getEventById(id);
  }

  @Post()
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('access-token') // Candado requerido por el issue
  @ApiOperation({ summary: 'Crear un nuevo evento (Privado)' })
  @ApiResponse({ status: 201, description: 'El evento ha sido creado exitosamente.' })
  @ApiResponse({ status: 401, description: 'No autorizado - Token inválido o inexistente.' })
  async createEvent(
    @Body() createEventDto: CreateEventDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<Event> {
    if (!req.user) throw new UnauthorizedException('User not authenticated');
    return await this.created.createEvent(createEventDto, req.user.id);
  }

  @Put(':id')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Actualizar un evento existente' })
  @ApiParam({ name: 'id', description: 'UUID del evento a modificar' })
  @ApiResponse({ status: 200, description: 'Evento actualizado correctamente.' })
  @ApiResponse({ status: 404, description: 'Evento no encontrado.' })
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
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Eliminar un evento (Soft Delete)' })
  @ApiParam({ name: 'id', description: 'UUID del evento a eliminar' })
  @ApiResponse({ status: 200, description: 'Evento eliminado lógicamente.' })
  async deleteEvent(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<Event> {
    if (!req.user) throw new UnauthorizedException('User not authenticated');
    return await this.deleted.softDeleteEvent(id, req.user.id);
  }
}