import api from "../lib/api";

export interface InscripcionDto {
  faccion?: string;
  nombre_ejercito?: string;
}

export const inscribirse = (eventoId: string, data?: InscripcionDto) =>
  api.post(`/events/${eventoId}/inscripcion`, data ?? {});
