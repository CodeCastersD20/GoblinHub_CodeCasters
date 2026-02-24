import { useState } from 'react'
import './Register.css'
import logo from '../../components/logo/logo.png'

const nivelesExperiencia = [
  { id: 'novato', emoji: '🌱', label: 'Novato', sub: 'Apenas empiezo' },
  { id: 'intermedio', emoji: '⚔️', label: 'Intermedio', sub: 'Tengo experiencia' },
  { id: 'veterano', emoji: '👑', label: 'Veterano', sub: 'Soy experto' },
]

const tiposJuego = [
  { id: 'wargames', emoji: '🎖️', label: 'Wargames' },
  { id: 'rol', emoji: '🎲', label: 'Juegos de Rol' },
  { id: 'mesa', emoji: '♟️', label: 'Juegos de Mesa' },
  { id: 'pintura', emoji: '🎨', label: 'Pintura' },
  { id: 'tcg', emoji: '🃏', label: 'TCG/CCG' },
  { id: 'torneos', emoji: '🏆', label: 'Torneos' },
]

const disponibilidad = [
  { id: 'lunes-viernes', label: 'Lunes a Viernes' },
  { id: 'sabados', label: 'Sábados' },
  { id: 'domingos', label: 'Domingos' },
  { id: 'tardes', label: 'Tardes' },
  { id: 'noches', label: 'Noches' },
]

  interface InteresesProps {
  onSiguiente: (datos: {
    nivel: string
    juegos: string[]
    juegosEspecificos: string
    dias: string[]
  }) => void
  onAnterior: () => void
}

function RegisterIntereses({ onSiguiente, onAnterior }: InteresesProps) {
  const [nivel, setNivel] = useState<string>('')
  const [juegos, setJuegos] = useState<string[]>([])
  const [juegosEspecificos, setJuegosEspecificos] = useState('')
  const [dias, setDias] = useState<string[]>([])
  const [errores, setErrores] = useState<Record<string, string>>({})

  const toggleJuego = (id: string) => {
    setJuegos(prev =>
      prev.includes(id) ? prev.filter(j => j !== id) : [...prev, id]
    )
  }

  const toggleDia = (id: string) => {
    setDias(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    )
  }

  const validar = () => {
    const nuevosErrores: Record<string, string> = {}
    if (!nivel) nuevosErrores.nivel = 'Selecciona tu nivel de experiencia'
    if (juegos.length === 0) nuevosErrores.juegos = 'Selecciona al menos un tipo de juego'
    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

const handleSiguiente = () => {
  if (validar()) onSiguiente({ nivel, juegos, juegosEspecificos, dias })
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
              <div className="fase activa">2</div>
              <span className="fase-label activa-label">Intereses</span>
            </div>
            <div className="fase-linea" />
            <div className="fase-item">
              <div className="fase">3</div>
              <span className="fase-label">Confirmación</span>
            </div>
          </div>

          <div className="datos-personales">
            <label className="titulo-datos">Tus Intereses de Juego</label>
            <label className="subtitulo-datos">
              Ayúdanos a personalizar tu experiencia seleccionando tus áreas de interés
            </label>

            {/* Nivel de experiencia */}
            <div className="seccion">
              <label className="campo-label">Nivel de Experiencia <span className="requerido">*</span></label>
              <div className="opciones-nivel">
                {nivelesExperiencia.map(n => (
                  <button
                    key={n.id}
                    className={`opcion-nivel ${nivel === n.id ? 'seleccionado' : ''}`}
                    onClick={() => setNivel(n.id)}
                    type="button"
                  >
                    <span className="opcion-emoji">{n.emoji}</span>
                    <span className="opcion-nombre">{n.label}</span>
                    <span className="opcion-sub">{n.sub}</span>
                  </button>
                ))}
              </div>
              {errores.nivel && <span className="error">{errores.nivel}</span>}
            </div>

            {/* Tipos de juego */}
            <div className="seccion">
              <label className="campo-label">
                ¿Qué tipo de juegos te interesan? <span className="requerido">*</span>
              </label>
              <p className="campo-hint">Selecciona todos los que apliquen</p>
              <div className="opciones-juego">
                {tiposJuego.map(j => (
                  <label key={j.id} className={`opcion-check ${juegos.includes(j.id) ? 'seleccionado' : ''}`}>
                    <input
                      type="checkbox"
                      checked={juegos.includes(j.id)}
                      onChange={() => toggleJuego(j.id)}
                    />
                    <span>{j.emoji} {j.label}</span>
                  </label>
                ))}
              </div>
              {errores.juegos && <span className="error">{errores.juegos}</span>}
            </div>

            {/* Juegos específicos */}
            <div className="seccion">
              <label className="campo-label">Juegos Específicos de Interés</label>
              <p className="campo-hint">Opcional – Cuéntanos qué juegos te gustan o quieres aprender</p>
              <textarea
                className="textarea-juegos"
                placeholder="Ej: Warhammer 40K, D&D 5e, Magic: The Gathering, Catan..."
                value={juegosEspecificos}
                onChange={e => setJuegosEspecificos(e.target.value)}
                rows={3}
              />
            </div>

            {/* Disponibilidad */}
            <div className="seccion">
              <label className="campo-label">Disponibilidad para Eventos</label>
              <p className="campo-hint">¿Cuándo puedes asistir a eventos?</p>
              <div className="opciones-juego">
                {disponibilidad.map(d => (
                  <label key={d.id} className={`opcion-check ${dias.includes(d.id) ? 'seleccionado' : ''}`}>
                    <input
                      type="checkbox"
                      checked={dias.includes(d.id)}
                      onChange={() => toggleDia(d.id)}
                    />
                    <span>{d.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="botones">
              <button className="regresar" onClick={onAnterior}>← Anterior</button>
              <button className="siguiente" onClick={handleSiguiente}>Siguiente →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterIntereses