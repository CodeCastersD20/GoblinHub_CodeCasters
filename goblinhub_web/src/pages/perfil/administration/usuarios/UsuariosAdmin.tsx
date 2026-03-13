import { useEffect, useState } from "react";
import "./UsuariosAdmin.css";
import EditarUsuarioModal from "./EditarUsuario/EditarUsuario";
import type { Usuario } from "./EditarUsuario/EditarUsuario";
import {
  deleteAdminUser,
  getAdminUsers,
  updateAdminUser,
  type AdminUserApi,
} from "../../../../services/users-admin.service";
import defaultAvatar from "../../../../assets/default_perfil.png";

const mapUser = (user: AdminUserApi): Usuario => ({
  id: user.id,
  nombre: user.nombre,
  apellidos: user.apellidos,
  foto: user.foto_perfil_url ?? defaultAvatar,
  nivel: user.nivel_experiencia,
  rol: user.rol,
  interes: "-",
  eventosAsistidos: user.eventos_asistidos,
  estado: user.activo ? "activo" : "inactivo",
  email: user.email,
  fechaRegistro: user.created_at.split("T")[0] ?? user.created_at,
});

function UsuariosAdmin() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioEditar, setUsuarioEditar] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminUsers()
      .then((res: { data: AdminUserApi[] }) =>
        setUsuarios(res.data.map(mapUser)),
      )
      .catch(() => setError("No se pudieron cargar los usuarios"))
      .finally(() => setLoading(false));
  }, []);

  const guardarUsuario = async (usuarioEditado: Usuario) => {
    try {
      await updateAdminUser(usuarioEditado.id, {
        nombre: usuarioEditado.nombre,
        apellidos: usuarioEditado.apellidos,
        nivel_experiencia: usuarioEditado.nivel,
        rol: usuarioEditado.rol,
        activo: usuarioEditado.estado === "activo",
      });

      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuarioEditado.id ? usuarioEditado : u)),
      );
      setUsuarioEditar(null);
    } catch {
      setError("No se pudo actualizar el usuario");
    }
  };

  const eliminarUsuario = async (id: string) => {
    try {
      await deleteAdminUser(id);
      setUsuarios((prev) => prev.filter((u) => u.id !== id));
    } catch {
      setError("No se pudo desactivar el usuario");
    }
  };

  /* ---------- Estadísticas ---------- */

  const totalUsuarios = usuarios.length;

  const usuariosActivos = usuarios.filter((u) => u.estado === "activo").length;

  const hace7dias = new Date();
  hace7dias.setDate(hace7dias.getDate() - 7);

  const nuevosUsuarios = usuarios.filter(
    (u) => new Date(u.fechaRegistro) >= hace7dias,
  ).length;

  return (
    <div className="users-admin-container">
      <h1>Administración de Usuarios</h1>

      {loading && <p>Cargando usuarios...</p>}
      {error && <p>{error}</p>}

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
