export interface CrecimientoMensual {
  mes: string;
  usuarios: number;
  eventos: number;
}

export interface DistribucionNivel {
  novato: number;
  intermedio: number;
  veterano: number;
}

export interface EventosPorTipo {
  tipo: string;
  cantidad: number;
}

export interface AsistenciaMensual {
  mes: string;
  asistentes: number;
}

export interface TopUsuario {
  nombre: string;
  apellidos: string;
  eventosAsistidos: number;
  puntos_fidelidad: number;
  nivel_experiencia: string;
}

export interface Analytics {
  usuariosActivos: number;
  eventosRealizados: number;
  totalAsistencias: number;
  tasaConversion: number;
  crecimientoMensual: CrecimientoMensual[];
  distribucionNivel: DistribucionNivel;
  eventosPorTipo: EventosPorTipo[];
  asistenciaMensual: AsistenciaMensual[];
  topUsuarios: TopUsuario[];
}
