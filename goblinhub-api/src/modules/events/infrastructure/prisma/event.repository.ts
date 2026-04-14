import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../connect/prisma.service';
import { Event } from '../../domain/entities/event.entity';
import { EventMapper } from '../mappers/event-status.mapper';
import { EventRepository } from '../../domain/repositories/event.repository';
import { Evento as PrismaEvento } from '@prisma/client';

@Injectable()
export class EventRepositoryPrisma extends EventRepository {
  constructor(private prisma: PrismaService) {
    super();
  }

  private toDate(value: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Invalid date value: ${value}`);
    }
    return parsed;
  }

  private toTime(value: string): Date {
    const trimmed = value.trim();

    if (trimmed.includes('T')) {
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }

    const timeMatch = trimmed.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (timeMatch) {
      const hh = Number(timeMatch[1]);
      const mm = Number(timeMatch[2]);
      const ss = Number(timeMatch[3] ?? '0');

      const isValidHour = hh >= 0 && hh <= 23;
      const isValidMinute = mm >= 0 && mm <= 59;
      const isValidSecond = ss >= 0 && ss <= 59;

      if (isValidHour && isValidMinute && isValidSecond) {
        return new Date(Date.UTC(1970, 0, 1, hh, mm, ss));
      }
    }

    throw new Error(`Invalid time value: ${value}`);
  }

  // --- Método auxiliar: evita repetir la construcción de la entidad ---
  private mapToDomain(e: PrismaEvento): Event {
    return new Event(
      e.id_evento,
      e.titulo,
      e.descripcion ?? undefined,
      EventMapper.tipoToDomain(e.tipo_evento),
      e.fecha.toISOString(),
      e.hora_inicio.toISOString(),
      e.hora_fin?.toISOString() ?? undefined,
      e.lugar,
      Number(e.costo),
      e.cupo_maximo,
      e.sistema_juego ?? undefined,
      e.puntos_premio_1,
      e.puntos_premio_2,
      e.puntos_premio_3,
      e.puntos_participacion,
      e.id_creador,
    );
  }

  async create(event: Event, id_creador: string): Promise<Event> {
    const created = await this.prisma.evento.create({
      data: {
        titulo: event.titulo,
        descripcion: event.descripcion,
        tipo_evento: EventMapper.tipoToPrisma(event.tipo_evento),
        fecha: this.toDate(event.fecha),
        hora_inicio: this.toTime(event.hora_inicio),
        hora_fin: event.hora_fin ? this.toTime(event.hora_fin) : undefined,
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

    return this.mapToDomain(created);
  }

  async findAll(): Promise<Event[]> {
    const eventos = await this.prisma.evento.findMany({
      where: { deleted_at: null },
    });

    return eventos.map((e) => this.mapToDomain(e));
  }

  async findById(id: string): Promise<Event | null> {
    const evento = await this.prisma.evento.findUnique({
      where: { id_evento: id, deleted_at: null },
    });

    if (!evento) return null;

    return this.mapToDomain(evento);
  }

  async findByName(name: string): Promise<Event | null> {
    const evento = await this.prisma.evento.findFirst({
      where: {
        titulo: { equals: name, mode: 'insensitive' },
        deleted_at: null,
      },
    });

    if (!evento) return null;

    return this.mapToDomain(evento);
  }

  async searchByName(name: string): Promise<Event[]> {
    const eventos = await this.prisma.evento.findMany({
      where: {
        titulo: { contains: name, mode: 'insensitive' },
        deleted_at: null,
      },
    });

    return eventos.map((e) => this.mapToDomain(e));
  }

  async update(id: string, event: Event): Promise<Event> {
    const updated = await this.prisma.evento.update({
      where: {
        id_evento: id,
        deleted_at: null,
      },
      data: {
        titulo: event.titulo,
        descripcion: event.descripcion,
        tipo_evento: EventMapper.tipoToPrisma(event.tipo_evento),
        fecha: this.toDate(event.fecha),
        hora_inicio: this.toTime(event.hora_inicio),
        hora_fin: event.hora_fin ? this.toTime(event.hora_fin) : undefined,
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

    return this.mapToDomain(updated);
  }

  async delete(id: string): Promise<Event> {
    const deleted = await this.prisma.evento.update({
      where: { id_evento: id },
      data: { deleted_at: new Date() },
    });

    return this.mapToDomain(deleted);
  }

  async expireEvents(): Promise<number> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const result = await this.prisma.evento.updateMany({
      where: {
        deleted_at: null,
        fecha: { lt: today },
      },
      data: { deleted_at: now },
    });

    return result.count;
  }
}
