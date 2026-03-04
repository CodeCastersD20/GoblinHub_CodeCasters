import React from "react";
import { useParams, Link } from "react-router-dom";
import "./EventoDetalle.css";

const EventoDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
        <h1>Detalles del Evento {id}</h1>
      <Link to="/eventos">
        ← Volver al calendario
      </Link>
    </div>
  );
};

export default EventoDetalle;
