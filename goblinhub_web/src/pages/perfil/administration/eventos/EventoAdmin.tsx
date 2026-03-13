import { useState } from "react";
import EventoNuevo from "./nuevoEvento/NuevoEvento";
import "./EventoAdmin.css";
import { useNavigate } from "react-router-dom";



interface Evento {
  id: number;
  titulo: string;
  fecha: string;
  lugar: string;
  cupo_maximo: number;
  cupo_disponible: number;
  precio: number;
  estado: string;
}

function EventosAdmin() {
  const navigate = useNavigate();
  const [openModal, setOpenModal] = useState(false);
  const [eventoEditando, setEventoEditando] = useState<Evento | null>(null);

  const [eventos, setEventos] = useState<Evento[]>([
    {
      id: 1,
      titulo: "Torneo Warhammer 40k",
      fecha: "2026-06-10",
      lugar: "Goblin Hub",
      cupo_maximo: 16,
      cupo_disponible: 10,
      precio: 50,
      estado: "Abierto",
    },
    {
      id: 2,
      titulo: "Sesión D&D",
      fecha: "2026-06-12",
      lugar: "Sala 2",
      cupo_maximo: 6,
      cupo_disponible: 4,
      precio: 30,
      estado: "Abierto",
    },
  ]);

  const eliminarEvento = (id: number) => {
    setEventos((prev) => prev.filter((evento) => evento.id !== id));
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

      <div className="events-grid">

        {eventos.map((evento) => (

          <div key={evento.id} className="event-card">

            <h3>{evento.titulo}</h3>

            <p>📅 {new Date(evento.fecha).toLocaleDateString()}</p>
            <p>📍 {evento.lugar}</p>

            <p>
              👥 {evento.cupo_maximo - evento.cupo_disponible}/{evento.cupo_maximo}
            </p>

            <p>💰 ${evento.precio}</p>

            <div className="card-buttons">

              <button
                className="view-btn"
                onClick={() => navigate(`/verEvento/${evento.id}`)}
              >
                Ver
              </button>

              <button
                className="edit-btn"
                onClick={() => abrirEditar(evento)}
              >
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

        <div
          className="modal-overlay"
          onClick={cerrarModal}
        >

          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >

            <button
              className="close-btn"
              onClick={cerrarModal}
            >
              ✖
            </button>

            <EventoNuevo
              evento={eventoEditando || undefined}
              onSuccess={cerrarModal}
            />

          </div>

        </div>

      )}

    </div>

  );

}

export default EventosAdmin;