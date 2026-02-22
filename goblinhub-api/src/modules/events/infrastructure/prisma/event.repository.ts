import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/connect/prisma.service';
import { Event } from '../../domain/entities/event.entity';
import { EventMapper } from '../mappers/event-status.mapper';
import { EventRepository } from '../../domain/repositories/event.repository';

@Injectable()
export class EventRepositoryPrisma extends EventRepository {
  constructor(private prisma: PrismaService) {
    super();
  }

  async create(event: Event, id_creador: string): Promise<Event> {
    const created = await this.prisma.evento.create({
      data: {
        titulo: event.titulo,
        descripcion: event.descripcion,
        tipo_evento: EventMapper.tipoToPrisma(event.tipo_evento),
        fecha: new Date(event.fecha),
        hora_inicio: new Date(event.hora_inicio),
        hora_fin: event.hora_fin ? new Date(event.hora_fin) : undefined,
        lugar: event.lugar,
        costo: event.costo,
        cupo_maximo: event.cupo_maximo,
        sistema_juego: event.sistema_juego,
        puntos_premio_1: event.puntos_premio_1,
        puntos_premio_2: event.puntos_premio_2,
        puntos_premio_3: event.puntos_premio_3,
        puntos_participacion: event.puntos_participacion,
        id_creador: id_creador,
      },
    });

    return new Event(
      created.id_evento,
      created.titulo,
      created.descripcion || undefined,
      EventMapper.tipoToDomain(created.tipo_evento),
      created.fecha.toISOString(),
      created.hora_inicio.toISOString(),
      created.hora_fin?.toISOString() || undefined,
      created.lugar,
      Number(created.costo) || undefined,
      created.cupo_maximo,
      created.sistema_juego || undefined,
      created.puntos_premio_1 || undefined,
      created.puntos_premio_2 || undefined,
      created.puntos_premio_3 || undefined,
      created.puntos_participacion || undefined,
    );
  }

  async findAll(): Promise<Event[]> {
    const eventos = await this.prisma.evento.findMany({
      where: { deleted_at: null },
    });

    return eventos.map(
      (e) =>
        new Event(
          e.id_evento,
          e.titulo,
          e.descripcion || undefined,
          EventMapper.tipoToDomain(e.tipo_evento),
          e.fecha.toISOString(),
          e.hora_inicio.toISOString(),
          e.hora_fin?.toISOString() || undefined,
          e.lugar,
          Number(e.costo) || undefined,
          e.cupo_maximo,
          e.sistema_juego || undefined,
          e.puntos_premio_1 || undefined,
          e.puntos_premio_2 || undefined,
          e.puntos_premio_3 || undefined,
          e.puntos_participacion || undefined,
        ),
    );
  }

  async findById(id: string): Promise<Event> {
    const evento = await this.prisma.evento.findUnique({
      where: { id_evento: id, deleted_at: null },
    });

    if (!evento) throw new Error('Event not found');

    return new Event(
      evento.id_evento,
      evento.titulo,
      evento.descripcion || undefined,
      EventMapper.tipoToDomain(evento.tipo_evento),
      evento.fecha.toISOString(),
      evento.hora_inicio.toISOString(),
      evento.hora_fin?.toISOString() || undefined,
      evento.lugar,
      Number(evento.costo) || undefined,
      evento.cupo_maximo,
      evento.sistema_juego || undefined,
      evento.puntos_premio_1 || undefined,
      evento.puntos_premio_2 || undefined,
      evento.puntos_premio_3 || undefined,
      evento.puntos_participacion || undefined,
    );
  }

  async findByName(name: string): Promise<Event> {
    const evento = await this.prisma.evento.findFirst({
      where: { titulo: name, deleted_at: null },
    });

    if (!evento) throw new Error('Event not found');

    return new Event(
      evento.id_evento,
      evento.titulo,
      evento.descripcion || undefined,
      EventMapper.tipoToDomain(evento.tipo_evento),
      evento.fecha.toISOString(),
      evento.hora_inicio.toISOString(),
      evento.hora_fin?.toISOString() || undefined,
      evento.lugar,
      Number(evento.costo) || undefined,
      evento.cupo_maximo,
      evento.sistema_juego || undefined,
      evento.puntos_premio_1 || undefined,
      evento.puntos_premio_2 || undefined,
      evento.puntos_premio_3 || undefined,
      evento.puntos_participacion || undefined,
    );
  }

  async update(id: string, event: Event): Promise<Event> {
    const updated = await this.prisma.evento.update({
      where: { id_evento: id },
      data: {
        titulo: event.titulo,
        descripcion: event.descripcion,
        tipo_evento: EventMapper.tipoToPrisma(event.tipo_evento),
        fecha: new Date(event.fecha),
        hora_inicio: new Date(event.hora_inicio),
        hora_fin: event.hora_fin ? new Date(event.hora_fin) : undefined,
        lugar: event.lugar,
        costo: event.costo,
        cupo_maximo: event.cupo_maximo,
        sistema_juego: event.sistema_juego,
        puntos_premio_1: event.puntos_premio_1,
        puntos_premio_2: event.puntos_premio_2,
        puntos_premio_3: event.puntos_premio_3,
        puntos_participacion: event.puntos_participacion,
      },
    });

    return new Event(
      updated.id_evento,
      updated.titulo,
      updated.descripcion || undefined,
      EventMapper.tipoToDomain(updated.tipo_evento),
      updated.fecha.toISOString(),
      updated.hora_inicio.toISOString(),
      updated.hora_fin?.toISOString() || undefined,
      updated.lugar,
      Number(updated.costo) || undefined,
      updated.cupo_maximo,
      updated.sistema_juego || undefined,
      updated.puntos_premio_1 || undefined,
      updated.puntos_premio_2 || undefined,
      updated.puntos_premio_3 || undefined,
      updated.puntos_participacion || undefined,
    );
  }

  async delete(id: string): Promise<Event> {
    const deleted = await this.prisma.evento.update({
      where: { id_evento: id },
      data: { deleted_at: new Date() },
    });

    return new Event(
      deleted.id_evento,
      deleted.titulo,
      deleted.descripcion || undefined,
      EventMapper.tipoToDomain(deleted.tipo_evento),
      deleted.fecha.toISOString(),
      deleted.hora_inicio.toISOString(),
      deleted.hora_fin?.toISOString() || undefined,
      deleted.lugar,
      Number(deleted.costo) || undefined,
      deleted.cupo_maximo,
      deleted.sistema_juego || undefined,
      deleted.puntos_premio_1 || undefined,
      deleted.puntos_premio_2 || undefined,
      deleted.puntos_premio_3 || undefined,
      deleted.puntos_participacion || undefined,
    );
  }
}
