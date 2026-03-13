import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/connect/prisma.service';
import {
  ILogRepository,
  LogFilters,
  PaginatedLogs,
} from '../domain/repositories/log.repository';
import { LogEntity, TipoLog } from '../domain/entities/log.entity';
import { Prisma } from '@prisma/client'; // Quitamos el PrismaTipoLog de aquí

@Injectable()
export class PrismaLogRepository implements ILogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: LogFilters): Promise<PaginatedLogs> {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const whereCondition: Prisma.Logs_ActividadWhereInput = {};

    if (filters.tipo) {
      // Convertimos el tipo a la enumeración esperada por Prisma
      whereCondition.tipo = filters.tipo;
    }

    if (filters.usuarioId) {
      whereCondition.id_usuario = filters.usuarioId;
    }

    if (filters.accion) {
      whereCondition.accion = { contains: filters.accion, mode: 'insensitive' };
    }

    if (filters.fechaDesde || filters.fechaHasta) {
      whereCondition.fecha_hora = {};
      if (filters.fechaDesde) {
        whereCondition.fecha_hora.gte = new Date(
          `${filters.fechaDesde}T00:00:00.000Z`,
        );
      }
      if (filters.fechaHasta) {
        whereCondition.fecha_hora.lte = new Date(
          `${filters.fechaHasta}T23:59:59.999Z`,
        );
      }
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.logs_Actividad.count({ where: whereCondition }),
      this.prisma.logs_Actividad.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { fecha_hora: 'desc' },
        include: {
          usuario: {
            select: { nombre: true, apellidos: true, rol: true },
          },
        },
      }),
    ]);

    const mappedData: LogEntity[] = data.map((log) => ({
      id_log: log.id_log.toString(),
      tipo: log.tipo as TipoLog,
      accion: log.accion,
      mensaje: log.mensaje,
      id_usuario: log.id_usuario,
      ip_address: log.ip_address,
      datos_extra: log.datos_extra as Record<string, unknown> | null,
      fecha_hora: log.fecha_hora,
      usuario: log.usuario
        ? {
            nombre: log.usuario.nombre,
            apellidos: log.usuario.apellidos,
            rol: log.usuario.rol,
          }
        : null,
    }));

    return {
      data: mappedData,
      total,
      page,
      limit,
    };
  }

  async findById(id: string): Promise<LogEntity | null> {
    const log = await this.prisma.logs_Actividad.findUnique({
      where: { id_log: BigInt(id) },
      include: {
        usuario: {
          select: { nombre: true, apellidos: true, rol: true },
        },
      },
    });

    if (!log) return null;

    return {
      id_log: log.id_log.toString(),
      tipo: log.tipo as TipoLog,
      accion: log.accion,
      mensaje: log.mensaje,
      id_usuario: log.id_usuario,
      ip_address: log.ip_address,
      datos_extra: log.datos_extra as Record<string, unknown> | null,
      fecha_hora: log.fecha_hora,
      usuario: log.usuario
        ? {
            nombre: log.usuario.nombre,
            apellidos: log.usuario.apellidos,
            rol: log.usuario.rol,
          }
        : null,
    };
  }

  async create(log: Omit<LogEntity, 'id_log' | 'fecha_hora'>): Promise<void> {
    await this.prisma.logs_Actividad.create({
      data: {
        // En lugar de usar el Enum de Prisma o 'any', lo parseamos con la magia de TypeScript
        tipo: log.tipo as unknown as Prisma.Logs_ActividadCreateInput['tipo'],
        accion: log.accion,
        mensaje: log.mensaje,
        id_usuario: log.id_usuario,
        ip_address: log.ip_address,
        datos_extra: log.datos_extra
          ? (log.datos_extra as Prisma.InputJsonValue)
          : Prisma.DbNull,
      },
    });
  }
}
