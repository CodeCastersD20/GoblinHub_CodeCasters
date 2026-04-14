import { useState, useEffect } from "react";
import "./EditarUsuario.css";

export interface Usuario {
  id: string;
  nombre: string;
  apellidos: string;
  foto: string;
  nivel: "novato" | "intermedio" | "veterano";
  rol: "admin" | "empleado" | "jugador";
  interes: string;
  eventosAsistidos: number;
  estado: "activo" | "inactivo";
  email?: string | null;
  fechaRegistro: string;
}

interface Props {
  usuario: Usuario | null;
  onClose: () => void;
  onGuardar: (usuarioEditado: Usuario) => void;
}

function EditarUsuarioModal({ usuario, onClose, onGuardar }: Props) {
  const [formData, setFormData] = useState<Usuario | null>(usuario);

  useEffect(() => {
    setFormData(usuario);
  }, [usuario]);

  if (!usuario || !formData) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onGuardar(formData);
  };

  return (
    <div className="user-edit-overlay">
      <div className="user-edit-modal">
        <button className="user-edit-close" onClick={onClose}>
          ✕
        </button>

        <h2>Editar Usuario</h2>

        <form className="user-edit-form" onSubmit={handleSubmit}>
          <div className="user-edit-grid">
            <div className="user-edit-field">
              <label>Nombre</label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
              />
            </div>

            <div className="user-edit-field">
              <label>Apellidos</label>
              <input
                type="text"
                name="apellidos"
                value={formData.apellidos}
                onChange={handleChange}
              />
            </div>

            <div className="user-edit-field">
              <label>Nivel</label>
              <select
                name="nivel"
                value={formData.nivel}
                onChange={handleChange}
              >
                <option value="novato">Novato</option>
                <option value="intermedio">Intermedio</option>
                <option value="veterano">Veterano</option>
              </select>
            </div>

            <div className="user-edit-field">
              <label>Rol</label>
              <select name="rol" value={formData.rol} onChange={handleChange}>
                <option value="jugador">Jugador</option>
                <option value="empleado">Empleado</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="user-edit-field user-edit-field--full">
              <label>Interés</label>
              <input
                type="text"
                name="interes"
                value={formData.interes}
                onChange={handleChange}
              />
            </div>

            <div className="user-edit-field">
              <label>Estado</label>
              <select
                name="estado"
                value={formData.estado}
                onChange={handleChange}
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          <div className="user-edit-buttons">
            <button type="submit" className="save-btn">
              Guardar
            </button>

            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditarUsuarioModal;
