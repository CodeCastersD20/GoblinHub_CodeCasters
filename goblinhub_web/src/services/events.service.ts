import api from "../lib/api";

export interface ApiEvent {
  id: string;
  titulo: string;
  descripcion?: string;
  tipo_evento: string;
  fecha: string;
  hora_inicio: string;
  hora_fin?: string;
  lugar: string;
  costo?: number;
  cupo_maximo: number;
  sistema_juego?: string;
}

export interface InscripcionDto {
  faccion?: string;
  nombre_ejercito?: string;
}

export const getEvents = () => api.get<ApiEvent[]>("/events");

export const inscribirse = (eventoId: string, data?: InscripcionDto) =>
  api.post(`/events/${eventoId}/inscripcion`, data ?? {});
