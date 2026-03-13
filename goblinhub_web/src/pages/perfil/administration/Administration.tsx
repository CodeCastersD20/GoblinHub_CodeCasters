import { Link } from "react-router-dom";
import "./Administration.css";
import type React from "react";

function AdminDashboard() {
  const adminCards = [
    {
      id: "eventos",
      title: "Gestión de Eventos",
      description: "Crear, editar y eliminar eventos del sistema",
      icon: "📅",
      link: "/eventosAdmin",
      color: "bg-blue-500",
    },
    {
      id: "usuarios",
      title: "Gestión de Usuarios",
      description: "Ver y administrar usuarios del sistema",
      icon: "👥",
      link: "/usuariosAdmin",
      color: "bg-purple-500",
    },
    {
      id: "logs",
      title: "Registros de Actividad",
      description: "Monitorear y auditar todas las acciones del sistema",
      icon: "📋",
      link: "/admin/logs",
      color: "bg-green-500",
    },
  ];

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>🛡️ Panel de Administración</h1>
        <p>Gestiona todos los aspectos de la plataforma</p>
      </div>

      <div className="admin-cards-container">
        {adminCards.map((card) => (
          <Link
            key={card.id}
            to={card.link}
            className="admin-card"
            style={{ "--card-color": card.color } as React.CSSProperties}
          >
            <div className={`admin-card-icon ${card.color}`}>{card.icon}</div>
            <h2 className="admin-card-title">{card.title}</h2>
            <p className="admin-card-description">{card.description}</p>
            <div className="admin-card-arrow">→</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default AdminDashboard;
