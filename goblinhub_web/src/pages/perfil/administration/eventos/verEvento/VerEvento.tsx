import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./VerEvento.css";
import {
  getEventById,
  type ApiEvent,
} from "../../../../../services/events.service";

interface Participante {
  id: number;
  nombre: string;
  puntos: number;
}

interface Evento {
  id: string;
  titulo: string;
  fecha: string;
  lugar: string;
  cupo_maximo: number;
  costo: number;
  estado: string;
}

function VerEventoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [evento, setEvento] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getEventById(id)
      .then(({ data }: { data: ApiEvent }) => {
        setEvento({
          id: data.id,
          titulo: data.titulo,
          fecha: data.fecha,
          lugar: data.lugar,
          cupo_maximo: data.cupo_maximo,
          costo: Number(data.costo ?? 0),
          estado: data.estado ?? "programado",
        });
      })
      .catch(() => setEvento(null))
      .finally(() => setLoading(false));
  }, [id]);

  const participantes: Participante[] = [
    { id: 1, nombre: "Juan", puntos: 1200 },
    { id: 2, nombre: "Carlos", puntos: 980 },
    { id: 3, nombre: "Ana", puntos: 860 },
  ];

  if (loading) return <p>Cargando evento...</p>;

  if (!evento) return <p>No se pudo cargar el evento.</p>;

  return (
    <div className="view-event-page">
      <h1>{evento.titulo}</h1>

      {/* ---------- RESUMEN ---------- */}

      <section className="event-summary">
        <h2>Resumen del Evento</h2>

        <div className="summary-grid">
          <p>
            <strong>Fecha:</strong>{" "}
            {new Date(evento.fecha).toLocaleDateString()}
          </p>

          <p>
            <strong>Lugar:</strong> {evento.lugar}
          </p>

          <p>
            <strong>Cupo:</strong> {evento.cupo_maximo}
          </p>

          <p>
            <strong>Precio:</strong> ${evento.costo}
          </p>

          <p>
            <strong>Estado:</strong> {evento.estado}
          </p>
        </div>
      </section>

      {/* ---------- PARTICIPANTES ---------- */}

      <section className="event-players">
        <h2>Participantes</h2>

        <div className="players-table">
          <div className="table-header">
            <span>Jugador</span>
            <span>Puntos</span>
          </div>

          {participantes.map((p) => (
            <div key={p.id} className="table-row">
              <span>{p.nombre}</span>

              <span>{p.puntos}</span>
            </div>
          ))}
        </div>
      </section>

      <button className="back-btn" onClick={() => navigate("/eventosAdmin")}>
        Volver
      </button>
    </div>
  );
}

export default VerEventoPage;
