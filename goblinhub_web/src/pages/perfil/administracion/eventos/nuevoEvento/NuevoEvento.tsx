import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./NuevoEvento.css";
import {
  createEvent,
  updateEvent,
  type EventUpsertDto,
} from "../../../../../services/events.service";

interface EventForm {
  id?: string;
  titulo: string;
  descripcion: string;
  tipo_evento: "torneo" | "iniciacion" | "taller" | "sesion_rol" | "especial";
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  lugar: string;
  costo: number;
  cupo_maximo: number;
  sistema_juego: string;
  puntos_premio_1: number;
  puntos_premio_2: number;
  puntos_premio_3: number;
  puntos_participacion: number;
}

interface EventoNuevoProps {
  evento?: Partial<EventForm>;
  onSuccess?: () => void;
}

function EventoNuevo({ evento, onSuccess }: EventoNuevoProps) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState<EventForm>({
    titulo: "",
    descripcion: "",
    tipo_evento: "torneo",
    fecha: "",
    hora_inicio: "",
    hora_fin: "",
    lugar: "",
    costo: 0,
    cupo_maximo: 1,
    sistema_juego: "",
    puntos_premio_1: 500,
    puntos_premio_2: 300,
    puntos_premio_3: 200,
    puntos_participacion: 50,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ---------- CARGAR EVENTO SI ES EDICIÓN ---------- */

  const [prevEvento, setPrevEvento] = useState(evento);

  if (evento !== prevEvento) {
    setPrevEvento(evento);
    if (evento) {
      setForm((prev) => ({
        ...prev,
        ...evento,
      }));
    }
  }

  /* ---------- HANDLE CHANGE ---------- */

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  /* ---------- VALIDACIÓN ---------- */

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!form.titulo.trim()) newErrors.titulo = "El título es obligatorio";

    if (!form.fecha) newErrors.fecha = "La fecha es obligatoria";

    if (!form.hora_inicio)
      newErrors.hora_inicio = "La hora de inicio es obligatoria";

    if (!form.lugar.trim()) newErrors.lugar = "El lugar es obligatorio";

    if (form.cupo_maximo < 1)
      newErrors.cupo_maximo = "Debe haber al menos 1 participante";

    if (form.costo < 0) newErrors.costo = "El costo no puede ser negativo";

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  /* ---------- SUBMIT ---------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      setLoading(true);
      setError("");

      const payload: EventUpsertDto = {
        titulo: form.titulo,
        descripcion: form.descripcion || undefined,
        tipo_evento: form.tipo_evento,
        fecha: form.fecha,
        hora_inicio: form.hora_inicio,
        hora_fin: form.hora_fin || undefined,
        lugar: form.lugar,
        costo: form.costo,
        cupo_maximo: form.cupo_maximo,
        sistema_juego: form.sistema_juego || undefined,
        puntos_premio_1: form.puntos_premio_1,
        puntos_premio_2: form.puntos_premio_2,
        puntos_premio_3: form.puntos_premio_3,
        puntos_participacion: form.puntos_participacion,
      };

      if (evento?.id) {
        await updateEvent(evento.id, payload);
        setSuccess("Evento actualizado correctamente");
      } else {
        await createEvent(payload);
        setSuccess("Evento creado correctamente");
      }

      setTimeout(() => {
        if (onSuccess) onSuccess();
        else navigate("/admin");
      }, 1000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error al guardar el evento");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-event-container">
      <h1>{evento ? "Editar Evento" : "Crear Evento"}</h1>

      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}

      <form onSubmit={handleSubmit} className="event-form">
        <section className="form-section">
          <h2>Información del evento</h2>

          <div className="form-grid">
            <div className="form-group">
              <label>Título *</label>
              <input
                name="titulo"
                value={form.titulo}
                onChange={handleChange}
              />
              {errors.titulo && (
                <span className="field-error">{errors.titulo}</span>
              )}
            </div>

            <div className="form-group">
              <label>Tipo de evento</label>
              <select
                name="tipo_evento"
                value={form.tipo_evento}
                onChange={handleChange}
              >
                <option value="torneo">Torneo</option>
                <option value="iniciacion">Iniciación</option>
                <option value="taller">Taller</option>
                <option value="sesion_rol">Sesión de Rol</option>
                <option value="especial">Especial</option>
              </select>
            </div>

            <div className="form-group full">
              <label>Descripción</label>
              <textarea
                name="descripcion"
                value={form.descripcion}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        <section className="form-section">
          <h2>Horario</h2>

          <div className="form-grid">
            <div className="form-group">
              <label>Fecha *</label>
              <input
                type="date"
                name="fecha"
                value={form.fecha}
                onChange={handleChange}
              />
              {errors.fecha && (
                <span className="field-error">{errors.fecha}</span>
              )}
            </div>

            <div className="form-group">
              <label>Hora inicio *</label>
              <input
                type="time"
                name="hora_inicio"
                value={form.hora_inicio}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Hora fin</label>
              <input
                type="time"
                name="hora_fin"
                value={form.hora_fin}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Lugar *</label>
              <input name="lugar" value={form.lugar} onChange={handleChange} />
            </div>
          </div>
        </section>

        <section className="form-section">
          <h2>Participación</h2>

          <div className="form-grid">
            <div className="form-group">
              <label>Costo</label>
              <input
                type="number"
                name="costo"
                value={form.costo}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Cupo máximo</label>
              <input
                type="number"
                name="cupo_maximo"
                value={form.cupo_maximo}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              if (onSuccess) onSuccess();
              else navigate("/admin");
            }}
          >
            Cancelar
          </button>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading
              ? "Guardando..."
              : evento
                ? "Actualizar Evento"
                : "Crear Evento"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default EventoNuevo;
