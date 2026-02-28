import React, { useState, useEffect } from "react";
import Button from "../../components/button/button";
import api from "../../lib/api";
import "./Event.css";

type TipoEvento =
  | "torneo"
  | "iniciacion"
  | "taller"
  | "sesion_rol"
  | "especial";
type TipoCard = "torneo" | "workshop" | "iniciacion" | "rol" | "especial";

interface ApiEvent {
  id: string;
  titulo: string;
  descripcion?: string;
  tipo_evento: TipoEvento;
  fecha: string;
  hora_inicio: string;
  hora_fin?: string;
  lugar: string;
  costo?: number | null;
  cupo_maximo: number;
  sistema_juego?: string;
}

interface EventCard {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin?: string;
  lugar: string;
  icono: string;
  titulo: string;
  tipo: TipoCard;
  tipoLabel: string;
  descripcion: string;
  cupoMaximo: number;
  costo?: number;
}

const TIPO_MAP: Record<
  TipoEvento,
  { tipo: TipoCard; tipoLabel: string; icono: string }
> = {
  torneo: { tipo: "torneo", tipoLabel: "TORNEO OFICIAL", icono: "⚔️" },
  iniciacion: { tipo: "iniciacion", tipoLabel: "INICIACIÓN", icono: "🎲" },
  taller: { tipo: "workshop", tipoLabel: "TALLER", icono: "🎨" },
  sesion_rol: { tipo: "rol", tipoLabel: "SESIÓN DE ROL", icono: "📖" },
  especial: { tipo: "especial", tipoLabel: "EVENTO ESPECIAL", icono: "⭐" },
};

function formatFecha(isoDate: string): string {
  // Extraer solo la parte de fecha (YYYY-MM-DD) sin importar si viene con timestamp
  const datePart = isoDate.includes("T") ? isoDate.split("T")[0] : isoDate;
  const [year, month, day] = datePart.split("-").map(Number);
  // Construir con hora local para evitar desfase de zona horaria
  const date = new Date(year, month - 1, day);
  return date
    .toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "short",
    })
    .replace(/^\w/, (c) => c.toUpperCase());
}

// Prisma almacena los campos Time como DateTime con fecha epoch (1970-01-01T17:00:00.000Z)
// Esta función extrae solo HH:MM sin importar el formato que llegue
function formatHora(isoTime: string): string {
  if (!isoTime) return "";
  if (isoTime.includes("T")) {
    // Timestamp completo → extraer HH:MM en UTC (la fecha epoch es solo artefacto de Prisma)
    return isoTime.substring(11, 16);
  }
  // Ya es un string de tiempo como "17:00:00" o "17:00"
  return isoTime.substring(0, 5);
}

function mapApiEvent(e: ApiEvent): EventCard {
  const { tipo, tipoLabel, icono } =
    TIPO_MAP[e.tipo_evento] ?? TIPO_MAP.especial;
  return {
    id: e.id,
    fecha: formatFecha(e.fecha),
    horaInicio: formatHora(e.hora_inicio),
    horaFin: e.hora_fin ? formatHora(e.hora_fin) : undefined,
    lugar: e.lugar,
    icono,
    titulo: e.titulo,
    tipo,
    tipoLabel,
    descripcion: e.descripcion ?? "Sin descripción.",
    cupoMaximo: e.cupo_maximo,
    // null de Prisma = sin costo asignado, lo tratamos como 0 (GRATIS)
    costo: e.costo ?? 0,
  };
}

const CalendarioAventuras: React.FC = () => {
  const [eventos, setEventos] = useState<EventCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mesActual] = useState("Febrero 2026");

  useEffect(() => {
    api
      .get<ApiEvent[]>("/events")
      .then((res) => setEventos(res.data.map(mapApiEvent)))
      .catch(() => setError("No se pudieron cargar los eventos."))
      .finally(() => setLoading(false));
  }, []);

  const handleInscribirse = (eventoId: string) => {
    console.log("Inscribirse en evento:", eventoId);
  };

  return (
    <div className="ca-page">
      <h1 className="ca-title">Calendario de Aventuras</h1>
      <p className="ca-subtitle">
        Torneos oficiales, días de iniciación, talleres de pintura y sesiones
        épicas
        <br />
        de rol. Planifica tu mes de juego.
      </p>

      <section className="ca-section">
        <div className="ca-section__header">
          <h2 className="ca-section__month">{mesActual}</h2>
        </div>

        {loading && <p className="ca-state-msg">Cargando eventos...</p>}
        {error && <p className="ca-state-msg ca-state-msg--error">{error}</p>}
        {!loading && !error && eventos.length === 0 && (
          <p className="ca-state-msg">No hay eventos programados.</p>
        )}

        <div className="ca-events">
          {eventos.map((evento) => (
            <div key={evento.id} className="ca-card">
              <div className={`ca-card__date ca-card__date--${evento.tipo}`}>
                <span className="ca-card__date-icon">{evento.icono}</span>
                {evento.fecha}
              </div>
              <h3 className="ca-card__title">{evento.titulo}</h3>
              <p className={`ca-card__type ca-card__type--${evento.tipo}`}>
                {evento.tipoLabel}
              </p>
              <p className="ca-card__desc">{evento.descripcion}</p>
              <div className="ca-card__meta">
                <span>
                  🕐 {evento.horaInicio}
                  {evento.horaFin ? ` - ${evento.horaFin}` : ""}
                </span>
                <span>📍 {evento.lugar}</span>
                <span>👥 Cupo: {evento.cupoMaximo}</span>
                {evento.costo !== undefined &&
                  (evento.costo === 0 ? (
                    <span style={{ color: "#dc2626", fontWeight: 700 }}>
                      🎉 ¡GRATIS!
                    </span>
                  ) : (
                    <span>💰 ${evento.costo}</span>
                  ))}
              </div>
              <Button
                variant="secondary"
                onClick={() => handleInscribirse(evento.id)}
                className="ca-btn--inscribirse"
              >
                Inscribirse
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default CalendarioAventuras;
