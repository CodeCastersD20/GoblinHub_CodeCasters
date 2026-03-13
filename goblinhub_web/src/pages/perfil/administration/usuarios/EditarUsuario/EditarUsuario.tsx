import { useState, useEffect } from "react";
import "./EditarUsuario.css";

export interface Usuario {
  id: number;
  nombre: string;
  foto: string;
  nivel: "novato" | "intermedio" | "veterano";
  interes: string;
  eventosAsistidos: number;
  estado: "activo" | "inactivo";
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
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
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

    <div className="modal-overlay">

      <div className="modal">

        <button
          className="close-btn"
          onClick={onClose}
        >
          ✕
        </button>

        <h2>Editar Usuario</h2>

        <form
          className="modal-form"
          onSubmit={handleSubmit}
        >

          <label>Nombre</label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
          />

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

          <label>Interés</label>
          <input
            type="text"
            name="interes"
            value={formData.interes}
            onChange={handleChange}
          />

          <label>Estado</label>
          <select
            name="estado"
            value={formData.estado}
            onChange={handleChange}
          >
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>

          <div className="modal-buttons">

            <button
              type="submit"
              className="save-btn"
            >
              Guardar
            </button>

            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
            >
              Cancelar
            </button>

          </div>

        </form>

      </div>

    </div>

  );
}

export default EditarUsuarioModal;