import { useState } from "react";
import "../register.css";
import RegisterHeader from "../components/RegisterHeader";
import type { DatosPersonales, DatosIntereses } from "../RegisterTypes";

const NIVELES_LABEL: Record<string, string> = {
  novato: "🌱 Novato",
  intermedio: "⚔️ Intermedio",
  veterano: "👑 Veterano",
};

const JUEGOS_LABEL: Record<string, string> = {
  wargames: "Wargames",
  rol: "Juegos de Rol",
  mesa: "Juegos de Mesa",
  pintura: "Pintura",
  tcg: "TCG/CCG",
  torneos: "Torneos",
};

interface ConfirmacionProps {
  onAnterior: () => void;
  onCompletar: () => void;
  datos: DatosPersonales;
  intereses: DatosIntereses;
}

function RegisterConfirmacion({
  onAnterior,
  onCompletar,
  datos,
  intereses,
}: ConfirmacionProps) {
  const [terminos, setTerminos] = useState(false);
  const [notificaciones, setNotificaciones] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});

  const validar = () => {
    const nuevosErrores: Record<string, string> = {};
    if (!terminos)
      nuevosErrores.terminos = "Debes aceptar los términos y condiciones";
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleCompletar = () => {
    if (validar()) onCompletar();
  };

  return (
    <div>
      <div className="base">
        <RegisterHeader faseActual={3} />

        <div className="formulario">
          <div className="datos-personales">
            <h2 className="titulo-datos">Revisa tu Información</h2>
            <h3 className="subtitulo-datos">
              Confirma que todos los datos sean correctos antes de registrarte
            </h3>

            {/* Resumen */}
            <div className="resumen">
              <p className="resumen-titulo">📋 Resumen de tu Registro</p>

              <div className="resumen-fila">
                <span className="resumen-key">Nombre Completo:</span>
                <span className="resumen-val">
                  {datos.nombre} {datos.apellido}
                </span>
              </div>
              <div className="resumen-fila">
                <span className="resumen-key">Fecha de Nacimiento:</span>
                <span className="resumen-val">{datos.nacimiento}</span>
              </div>
              <div className="resumen-fila">
                <span className="resumen-key">Email:</span>
                <span className="resumen-val">{datos.correo}</span>
              </div>
              <div className="resumen-fila">
                <span className="resumen-key">Teléfono:</span>
                <span className="resumen-val">{datos.telefono}</span>
              </div>
              <div className="resumen-fila">
                <span className="resumen-key">Nivel de Experiencia:</span>
                <span className="resumen-val">
                  {NIVELES_LABEL[intereses.nivel] ?? intereses.nivel}
                </span>
              </div>
              <div className="resumen-fila">
                <span className="resumen-key">Intereses:</span>
                <span className="resumen-val">
                  {intereses.juegos
                    .map((j) => JUEGOS_LABEL[j] ?? j)
                    .join(", ") || "—"}
                </span>
              </div>
              {intereses.juegosEspecificos && (
                <div className="resumen-fila">
                  <span className="resumen-key">Juegos de Interés:</span>
                  <span className="resumen-val">
                    {intereses.juegosEspecificos}
                  </span>
                </div>
              )}
              {intereses.dias.length > 0 && (
                <div className="resumen-fila">
                  <span className="resumen-key">Disponibilidad:</span>
                  <span className="resumen-val">
                    {intereses.dias.join(", ")}
                  </span>
                </div>
              )}
            </div>

            {/* Checkboxes */}
            <div className="confirmacion-checks">
              <label
                className={`check-item ${errores.terminos ? "check-error" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={terminos}
                  onChange={(e) => setTerminos(e.target.checked)}
                />
                <span>
                  Acepto los términos y condiciones y la política de privacidad{" "}
                  <span className="requerido">*</span>
                </span>
              </label>
              {errores.terminos && (
                <span className="error">{errores.terminos}</span>
              )}

              <label className="check-item">
                <input
                  type="checkbox"
                  checked={notificaciones}
                  onChange={(e) => setNotificaciones(e.target.checked)}
                />
                <span>
                  Deseo recibir notificaciones sobre eventos y promociones
                </span>
              </label>
            </div>

            <div className="botones">
              <button className="regresar" onClick={onAnterior}>
                ← Anterior
              </button>
              <button className="siguiente completar" onClick={handleCompletar}>
                ✔ Completar Registro
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterConfirmacion;
