import {
  EventValidationStatus as DomainEventType,
  EventStatus as DomainEventStatus,
} from '../../domain/enums/event.enum';
import {
  TipoEvento as PrismaTipoEvento,
  EstadoEvento as PrismaEstadoEvento,
} from '@prisma/client';

export class EventMapper {
  // Mapeo para TipoEvento
  static tipoToPrisma(tipo: DomainEventType): PrismaTipoEvento {
    return tipo as PrismaTipoEvento;
  }

  static tipoToDomain(tipo: PrismaTipoEvento): DomainEventType {
    return tipo as DomainEventType;
  }

  // Mapeo para EstadoEvento
  static estadoToPrisma(estado: DomainEventStatus): PrismaEstadoEvento {
    return estado as PrismaEstadoEvento;
  }

  static estadoToDomain(estado: PrismaEstadoEvento): DomainEventStatus {
    return estado as DomainEventStatus;
  }
}
