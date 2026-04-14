import api from "../lib/api";

export interface TimeBucket {
  label: string;
  value: number;
}

export interface TopUser {
  id_usuario: string;
  nombre: string;
  apellidos: string;
  eventosAsistidos: number;
  puntos: number;
  nivel: string;
}

export interface DashboardMetrics {
  summary: {
    totalUsuarios: number;
    totalProductos: number;
    usuariosActivos: number;
    eventosRealizados: number;
    eventosProximos: number;
    totalAsistencias: number;
    totalNovatos: number;
    tasaConversion: number | null;
    ocupacion: number | null;
  };
  crecimientoUsuarios: TimeBucket[];
  crecimientoEventos: TimeBucket[];
  distribucionNiveles: TimeBucket[];
  eventosPorTipo: TimeBucket[];
  asistenciaPorMes: TimeBucket[];
  topUsuarios: TopUser[];
}

export const getDashboardMetrics = (months = 6) =>
  api.get<DashboardMetrics>("/logs/dashboard/metrics", {
    params: { months },
  });
