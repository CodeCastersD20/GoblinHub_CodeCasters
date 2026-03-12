import { useParams, useNavigate } from "react-router-dom";
import "./VerEvento.css";

interface Participante {
  id: number;
  nombre: string;
  puntos: number;
}

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

function VerEventoPage() {

  const { id } = useParams();
  const navigate = useNavigate();

  /* EVENTO SIMULADO (luego vendrá del backend) */

  const evento: Evento = {
    id: Number(id),
    titulo: "Torneo Warhammer 40k",
    fecha: "2026-06-10",
    lugar: "Goblin Hub",
    cupo_maximo: 16,
    cupo_disponible: 10,
    precio: 50,
    estado: "Abierto",
  };

  const participantes: Participante[] = [
    { id: 1, nombre: "Juan", puntos: 1200 },
    { id: 2, nombre: "Carlos", puntos: 980 },
    { id: 3, nombre: "Ana", puntos: 860 },
  ];

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
            <strong>Cupo:</strong>{" "}
            {evento.cupo_maximo - evento.cupo_disponible}/{evento.cupo_maximo}
          </p>

          <p>
            <strong>Precio:</strong> ${evento.precio}
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

      <button
        className="back-btn"
        onClick={() => navigate("/admin")}
      >
        Volver
      </button>

    </div>

  );

}

export default VerEventoPage;