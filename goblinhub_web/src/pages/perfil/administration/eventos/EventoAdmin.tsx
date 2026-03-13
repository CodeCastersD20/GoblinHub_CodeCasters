import { useEffect, useState } from "react";
import EventoNuevo from "./nuevoEvento/NuevoEvento";
import "./EventoAdmin.css";
import { useNavigate } from "react-router-dom";
import {
  deleteEvent,
  getEvents,
  type ApiEvent,
} from "../../../../services/events.service";

interface Evento {
  id: string;
  titulo: string;
  fecha: string;
  descripcion?: string;
  tipo_evento: "torneo" | "iniciacion" | "taller" | "sesion_rol" | "especial";
  hora_inicio: string;
  hora_fin?: string;
  lugar: string;
  cupo_maximo: number;
  costo: number;
  sistema_juego?: string;
}

const toInputDate = (isoDate: string) =>
  (isoDate.includes("T") ? isoDate.split("T")[0] : isoDate) || "";

const toInputTime = (value?: string) => {
  if (!value) return "";
  return value.includes("T") ? value.substring(11, 16) : value.substring(0, 5);
};

const mapEvent = (event: ApiEvent): Evento => ({
  id: event.id,
  titulo: event.titulo,
  fecha: toInputDate(event.fecha),
  descripcion: event.descripcion,
  tipo_evento: event.tipo_evento,
  hora_inicio: toInputTime(event.hora_inicio),
  hora_fin: toInputTime(event.hora_fin),
  lugar: event.lugar,
  cupo_maximo: event.cupo_maximo,
  costo: Number(event.costo ?? 0),
  sistema_juego: event.sistema_juego,
});

function EventosAdmin() {
  const navigate = useNavigate();
  const [openModal, setOpenModal] = useState(false);
  const [eventoEditando, setEventoEditando] = useState<Evento | null>(null);

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarEventos = () => {
    setLoading(true);
    setError(null);
    getEvents()
      .then((res: { data: ApiEvent[] }) => setEventos(res.data.map(mapEvent)))
      .catch(() => setError("No se pudieron cargar los eventos"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getEvents()
      .then((res: { data: ApiEvent[] }) => setEventos(res.data.map(mapEvent)))
      .catch(() => setError("No se pudieron cargar los eventos"))
      .finally(() => setLoading(false));
  }, []);

  const eliminarEvento = async (id: string) => {
    try {
      await deleteEvent(id);
      setEventos((prev) => prev.filter((evento) => evento.id !== id));
    } catch {
      setError("No se pudo eliminar el evento");
    }
  };

  const abrirEditar = (evento: Evento) => {
    setEventoEditando(evento);
    setOpenModal(true);
  };

  const cerrarModal = () => {
    setOpenModal(false);
    setEventoEditando(null);
  };

  return (
    <div className="admin-container">
      <h1>Panel de Administración</h1>

      <button
        className="create-event-btn"
        onClick={() => {
          setEventoEditando(null);
          setOpenModal(true);
        }}
      >
        Crear Evento
      </button>

      {loading && <p>Cargando eventos...</p>}
      {error && <p>{error}</p>}

      <div className="events-grid">
        {eventos.map((evento) => (
          <div key={evento.id} className="event-card">
            <h3>{evento.titulo}</h3>

            <p>📅 {new Date(evento.fecha).toLocaleDateString()}</p>
            <p>📍 {evento.lugar}</p>

            <p>👥 {evento.cupo_maximo}</p>

            <p>💰 ${evento.costo}</p>

            <div className="card-buttons">
              <button
                className="view-btn"
                onClick={() => navigate(`/verEvento/${evento.id}`)}
              >
                Ver
              </button>

              <button className="edit-btn" onClick={() => abrirEditar(evento)}>
                Editar
              </button>

              <button
                className="delete-btn"
                onClick={() => eliminarEvento(evento.id)}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {openModal && (
        <div className="event-admin-overlay" onClick={cerrarModal}>
          <div
            className="event-admin-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="event-admin-close" onClick={cerrarModal}>
              ✖
            </button>

            <EventoNuevo
              evento={eventoEditando || undefined}
              onSuccess={() => {
                cerrarModal();
                cargarEventos();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default EventosAdmin;
