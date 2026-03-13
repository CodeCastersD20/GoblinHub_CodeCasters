import { useState } from "react";
import "./UsuariosAdmin.css";
import EditarUsuarioModal from "./EditarUsuario/EditarUsuario";
import type { Usuario } from "./EditarUsuario/EditarUsuario";

const usuariosMock: Usuario[] = [
  {
    id: 1,
    nombre: "Juan Pérez",
    foto: "https://i.pravatar.cc/150?img=3",
    nivel: "novato",
    interes: "Warhammer 40k",
    eventosAsistidos: 3,
    estado: "activo",
    fechaRegistro: "2026-03-01",
  },
  {
    id: 2,
    nombre: "Ana Torres",
    foto: "https://i.pravatar.cc/150?img=5",
    nivel: "veterano",
    interes: "D&D",
    eventosAsistidos: 12,
    estado: "activo",
    fechaRegistro: "2025-11-21",
  },
  {
    id: 3,
    nombre: "Carlos Ruiz",
    foto: "https://i.pravatar.cc/150?img=8",
    nivel: "intermedio",
    interes: "Magic",
    eventosAsistidos: 7,
    estado: "inactivo",
    fechaRegistro: "2026-03-05",
  },
];

function UsuariosAdmin() {
  const [usuarios, setUsuarios] = useState<Usuario[]>(usuariosMock);
  const [usuarioEditar, setUsuarioEditar] = useState<Usuario | null>(null);

  const guardarUsuario = (usuarioEditado: Usuario) => {
    setUsuarios(
      usuarios.map((u) =>
        u.id === usuarioEditado.id ? usuarioEditado : u
      )
    );

    setUsuarioEditar(null);
  };

  const eliminarUsuario = (id: number) => {
    setUsuarios(usuarios.filter((u) => u.id !== id));
  };

  /* ---------- Estadísticas ---------- */

  const totalUsuarios = usuarios.length;

  const usuariosActivos = usuarios.filter(
    (u) => u.estado === "activo"
  ).length;

  const hace7dias = new Date();
  hace7dias.setDate(hace7dias.getDate() - 7);

  const nuevosUsuarios = usuarios.filter(
    (u) => new Date(u.fechaRegistro) >= hace7dias
  ).length;

  return (
    <div className="users-admin-container">

      <h1>Administración de Usuarios</h1>

      {/* ---------- RESUMEN ---------- */}

      <div className="users-stats">

        <div className="stat-card">
          <h3>Total de usuarios</h3>
          <p>{totalUsuarios}</p>
        </div>

        <div className="stat-card">
          <h3>Usuarios activos</h3>
          <p>{usuariosActivos}</p>
        </div>

        <div className="stat-card">
          <h3>Nuevos esta semana</h3>
          <p>{nuevosUsuarios}</p>
        </div>

      </div>

      {/* ---------- TABLA ---------- */}

      <table className="users-table">

        <thead>
          <tr>
            <th>Foto</th>
            <th>Nombre</th>
            <th>Nivel</th>
            <th>Interés</th>
            <th>Eventos</th>
            <th>Estado</th>
            <th>Registro</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>

          {usuarios.map((usuario) => (

            <tr key={usuario.id}>

              <td>
                <img
                  src={usuario.foto}
                  alt={usuario.nombre}
                  className="user-avatar"
                />
              </td>

              <td>{usuario.nombre}</td>
              <td>{usuario.nivel}</td>
              <td>{usuario.interes}</td>
              <td>{usuario.eventosAsistidos}</td>
              <td>{usuario.estado}</td>
              <td>{usuario.fechaRegistro}</td>

              <td className="user-actions">

                <button
                  className="user-edit-btn"
                  onClick={() => setUsuarioEditar(usuario)}
                >
                  Editar
                </button>

                <button
                  className="user-delete-btn"
                  onClick={() => eliminarUsuario(usuario.id)}
                >
                  Eliminar
                </button>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

      {/* ---------- MODAL ---------- */}

      {usuarioEditar && (

        <EditarUsuarioModal
          usuario={usuarioEditar}
          onClose={() => setUsuarioEditar(null)}
          onGuardar={guardarUsuario}
        />

      )}

    </div>
  );
}

export default UsuariosAdmin;