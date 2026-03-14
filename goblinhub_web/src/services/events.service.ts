import api from "../lib/api";

export type EventValidationStatus =
  | "torneo"
  | "iniciacion"
  | "taller"
  | "sesion_rol"
  | "especial";

export type EventStatus =
  | "programado"
  | "en_curso"
  | "finalizado"
  | "cancelado";

export interface ApiEvent {
  id: string;
  titulo: string;
  descripcion?: string;
  tipo_evento: EventValidationStatus;
  fecha: string;
  hora_inicio: string;
  hora_fin?: string;
  lugar: string;
  costo?: number;
  cupo_maximo: number;
  estado?: EventStatus;
  sistema_juego?: string;
  puntos_premio_1?: number;
  puntos_premio_2?: number;
  puntos_premio_3?: number;
  puntos_participacion?: number;
}

export interface EventUpsertDto {
  titulo: string;
  descripcion?: string;
  tipo_evento: EventValidationStatus;
  fecha: string;
  hora_inicio: string;
  hora_fin?: string;
  lugar: string;
  costo?: number;
  cupo_maximo: number;
  estado?: EventStatus;
  sistema_juego?: string;
  puntos_premio_1?: number;
  puntos_premio_2?: number;
  puntos_premio_3?: number;
  puntos_participacion?: number;
}

export interface InscripcionDto {
  faccion?: string;
  nombre_ejercito?: string;
}

export const getEvents = () => api.get<ApiEvent[]>("/events");

export const getEventById = (id: string) => api.get<ApiEvent>(`/events/${id}`);

export const createEvent = (payload: EventUpsertDto) =>
  api.post<ApiEvent>("/events", payload);

export const updateEvent = (id: string, payload: EventUpsertDto) =>
  api.put<ApiEvent>(`/events/${id}`, payload);

export const deleteEvent = (id: string) =>
  api.delete<ApiEvent>(`/events/${id}`);

export const inscribirse = (eventoId: string, data?: InscripcionDto) =>
  api.post(`/events/${eventoId}/inscripcion`, data ?? {});
