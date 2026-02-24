import { useState } from 'react'
import './Register.css'
import logo from '../../components/logo/logo.png'

interface ConfirmacionProps {
  onAnterior: () => void
  onCompletar: () => void
  datos: {
    nombre: string
    apellido: string
    nacimiento: string
    telefono: string
    correo: string
    contrasena: string
    encuesta: string
  }
  intereses: {
    nivel: string
    juegos: string[]
    juegosEspecificos: string
    dias: string[]
  }
}

function RegisterConfirmacion({ onAnterior, onCompletar, datos, intereses }: ConfirmacionProps) {
  const [terminos, setTerminos] = useState(false)
  const [notificaciones, setNotificaciones] = useState(false)
  const [errores, setErrores] = useState<Record<string, string>>({})

  const nivelesLabel: Record<string, string> = {
    novato: '🌱 Novato',
    intermedio: '⚔️ Intermedio',
    veterano: '👑 Veterano',
  }

  const juegosLabel: Record<string, string> = {
    wargames: 'Wargames',
    rol: 'Juegos de Rol',
    mesa: 'Juegos de Mesa',
    pintura: 'Pintura',
    tcg: 'TCG/CCG',
    torneos: 'Torneos',
  }

  const validar = () => {
    const nuevosErrores: Record<string, string> = {}
    if (!terminos) nuevosErrores.terminos = 'Debes aceptar los términos y condiciones'
    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  const handleCompletar = () => {
    if (validar()) onCompletar()
  }

  return (
    <div>
      <div className="base">
        <div className="encabezado">
          <img src={logo} alt="goblin" className="goblin" />
          <label className="title">Únete a la Comunidad</label>
          <p className="subtitle">Tu aventura comienza aquí</p>
        </div>

        <div className="formulario">
          {/* Fases */}
          <div className="fases">
            <div className="fase-item">
              <div className="fase completada">1</div>
              <span className="fase-label">Datos Básicos</span>
            </div>
            <div className="fase-linea" />
            <div className="fase-item">
              <div className="fase completada">2</div>
              <span className="fase-label">Intereses</span>
            </div>
            <div className="fase-linea" />
            <div className="fase-item">
              <div className="fase activa">3</div>
              <span className="fase-label activa-label">Confirmación</span>
            </div>
          </div>

          <div className="datos-personales">
            <label className="titulo-datos">Revisa tu Información</label>
            <label className="subtitulo-datos">Confirma que todos los datos sean correctos antes de registrarte</label>

            {/* Resumen */}
            <div className="resumen">
              <p className="resumen-titulo">📋 Resumen de tu Registro</p>

              <div className="resumen-fila">
                <span className="resumen-key">Nombre Completo:</span>
                <span className="resumen-val">{datos.nombre} {datos.apellido}</span>
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
                <span className="resumen-val">{nivelesLabel[intereses.nivel] || intereses.nivel}</span>
              </div>
              <div className="resumen-fila">
                <span className="resumen-key">Intereses:</span>
                <span className="resumen-val">
                  {intereses.juegos.map(j => juegosLabel[j] || j).join(', ') || '—'}
                </span>
              </div>
              {intereses.juegosEspecificos && (
                <div className="resumen-fila">
                  <span className="resumen-key">Juegos de Interés:</span>
                  <span className="resumen-val">{intereses.juegosEspecificos}</span>
                </div>
              )}
              {intereses.dias.length > 0 && (
                <div className="resumen-fila">
                  <span className="resumen-key">Disponibilidad:</span>
                  <span className="resumen-val">{intereses.dias.join(', ')}</span>
                </div>
              )}
            </div>

            {/* Checkboxes */}
            <div className="confirmacion-checks">
              <label className={`check-item ${errores.terminos ? 'check-error' : ''}`}>
                <input
                  type="checkbox"
                  checked={terminos}
                  onChange={e => setTerminos(e.target.checked)}
                />
                <span>Acepto los términos y condiciones y la política de privacidad <span className="requerido">*</span></span>
              </label>
              {errores.terminos && <span className="error">{errores.terminos}</span>}

              <label className="check-item">
                <input
                  type="checkbox"
                  checked={notificaciones}
                  onChange={e => setNotificaciones(e.target.checked)}
                />
                <span>Deseo recibir notificaciones sobre eventos y promociones</span>
              </label>
            </div>

            <div className="botones">
              <button className="regresar" onClick={onAnterior}>← Anterior</button>
              <button className="siguiente completar" onClick={handleCompletar}>✔ Completar Registro</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterConfirmacion