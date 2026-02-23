import React, { useState } from "react";
import Button from "../../components/button/button";
import "./Event.css";

interface Event {
  id: number;
  fecha: string;
  icono: string;
  titulo: string;
  tipo: "torneo" | "workshop" | "iniciacion" | "rol";
  tipoLabel: string;
  descripcion: string;
}

const eventos: Event[] = [
  {
    id: 1,
    fecha: "Sábado 15 Feb",
    icono: "⚔️",
    titulo: "Torneo Warhammer 40K",
    tipo: "torneo",
    tipoLabel: "TORNEO OFICIAL",
    descripcion:
      "Formato 2000 puntos. Inscripciones abiertas. Cupo limitado: 16 jugadores.",
  },
];

const CalendarioAventuras: React.FC = () => {
  const [mesActual] = useState("Febrero 2026");

  const handleAnterior = () => {
    console.log("Mes anterior");
  };

  const handleSiguiente = () => {
    console.log("Mes siguiente");
  };

  const handleInscribirse = (eventoId: number) => {
    console.log("Inscribirse en evento:", eventoId);
  };

  return (
    <div className="ca-page">

      {/* Título principal */}
      <h1 className="ca-title">Calendario de Aventuras</h1>
      <p className="ca-subtitle">
        Torneos oficiales, días de iniciación, talleres de pintura y sesiones épicas
        <br />
        de rol. Planifica tu mes de juego.
      </p>

      {/* Sección del calendario */}
      <section className="ca-section">

        {/* Cabecera del mes */}
        <div className="ca-section__header">
          <h2 className="ca-section__month">{mesActual}</h2>
          <div className="ca-section__nav">
            <Button variant="primary" onClick={handleAnterior} className="ca-btn--nav">
              ← Anterior
            </Button>
            <Button variant="primary" onClick={handleSiguiente} className="ca-btn--nav">
              Siguiente →
            </Button>
          </div>
        </div>

        {/* Grid de eventos */}
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