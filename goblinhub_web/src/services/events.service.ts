import api from "../lib/api";

export type TipoEvento =
  | "torneo"
  | "iniciacion"
  | "taller"
  | "sesion_rol"
  | "especial";

export interface ApiEvent {
  id: string;
  titulo: string;
  descripcion?: string;
  tipo_evento: TipoEvento;
  fecha: string;
  hora_inicio: string;
  hora_fin?: string;
  lugar: string;
  costo?: number;
  cupo_maximo: number;
  sistema_juego?: string;
  puntos_premio_1?: number;
  puntos_premio_2?: number;
  puntos_premio_3?: number;
  puntos_participacion?: number;
  estado?: "programado" | "en_curso" | "finalizado" | "cancelado";
}

export interface EventUpsertDto {
  titulo: string;
  descripcion?: string;
  tipo_evento: TipoEvento;
  fecha: string;
  hora_inicio: string;
  hora_fin?: string;
  lugar: string;
  costo?: number;
  cupo_maximo: number;
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

export const createEvent = (data: EventUpsertDto) =>
  api.post<ApiEvent>("/events", data);

export const updateEvent = (id: string, data: Partial<EventUpsertDto>) =>
  api.put<ApiEvent>(`/events/${id}`, data);

export const deleteEvent = (id: string) => api.delete(`/events/${id}`);

export const inscribirse = (eventoId: string, data?: InscripcionDto) =>
  api.post(`/events/${eventoId}/inscripcion`, data ?? {});
