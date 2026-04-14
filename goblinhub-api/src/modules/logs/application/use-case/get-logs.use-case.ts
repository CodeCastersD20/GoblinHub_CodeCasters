import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  ILogRepository,
  LogFilters,
  PaginatedLogs,
} from '../../domain/repositories/log.repository';
import { LOG_REPOSITORY } from '../../domain/repositories/log.repository';
import { LogEntity } from '../../domain/entities/log.entity';

@Injectable()
export class GetLogsUseCase {
  constructor(
    // Inyectamos la interfaz, NO la implementación de Prisma directamente.
    // ¡Esto es la magia de la Arquitectura Limpia!
    @Inject(LOG_REPOSITORY)
    private readonly logRepository: ILogRepository,
  ) {}

  // Caso de uso 1: Obtener todos los logs (con filtros)
  async execute(filters: LogFilters): Promise<PaginatedLogs> {
    // Aquí podrías agregar reglas de negocio extra si las tuvieras antes de buscar
    return this.logRepository.findAll(filters);
  }

  // Caso de uso 2: Obtener el detalle de un log específico
  async getById(id: string): Promise<LogEntity> {
    const log = await this.logRepository.findById(id);

    if (!log) {
      // Si el ID no existe, lanzamos un error HTTP 404 amigable
      throw new NotFoundException(
        `El registro de log con ID ${id} no fue encontrado.`,
      );
    }

    return log;
  }
}
