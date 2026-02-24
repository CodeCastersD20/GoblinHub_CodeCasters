import { useState } from 'react'
import './Register.css'
import logo from '../../components/logo/logo.png'

interface RegisterProps {
  onSiguiente: (datos: {
    nombre: string
    apellido: string
    nacimiento: string
    telefono: string
    correo: string
    contrasena: string
    encuesta: string
  }) => void
}

function Register({ onSiguiente }: RegisterProps) {
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    nacimiento: '',
    telefono: '',
    correo: '',
    contrasena: '',
    encuesta: ''
  })

  const [errores, setErrores] = useState<Record<string, string>>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const validar = () => {
    const nuevosErrores: Record<string, string> = {}
    if (!form.nombre.trim()) nuevosErrores.nombre = 'El nombre es requerido'
    if (!form.apellido.trim()) nuevosErrores.apellido = 'El apellido es requerido'
    if (!form.nacimiento) nuevosErrores.nacimiento = 'La fecha es requerida'
    if (!form.telefono.trim()) nuevosErrores.telefono = 'El teléfono es requerido'
    if (!form.correo.trim()) nuevosErrores.correo = 'El correo es requerido'
    else if (!/\S+@\S+\.\S+/.test(form.correo)) nuevosErrores.correo = 'Correo inválido'
    if (!form.contrasena.trim()) nuevosErrores.contrasena = 'La contraseña es requerida'
    else if (form.contrasena.length < 6) nuevosErrores.contrasena = 'Mínimo 6 caracteres'
    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  // 👇 esta función SÍ se usa en el botón de abajo
const handleSiguiente = () => {
  if (validar()) onSiguiente(form) // 👈 pasa el form
}


  return (
    <div>
      <div className="base">
        <div className='encabezado'>
          <img src={logo} alt="goblin" className="goblin" />
          <label className="title">Unete a la comunidad</label>
          <p className="subtitle">Tu aventura comienza aqui</p>
        </div>
        <div className="formulario">
          <div className="fases">
            <div className="fase-item">
              <div className="fase activa">1</div>
              <span className="fase-label activa-label">Datos Básicos</span>
            </div>
            <div className="fase-linea" />
            <div className="fase-item">
              <div className="fase">2</div>
              <span className="fase-label">Intereses</span>
            </div>
            <div className="fase-linea" />
            <div className="fase-item">
              <div className="fase">3</div>
              <span className="fase-label">Confirmación</span>
            </div>
          </div>
          <div className="datos-personales">
            <label className="titulo-datos">Informacion personal</label>
            <label className="subtitulo-datos">Cuentanos sobre ti</label>
            <div className="datos">

              <div className='campo'>
                <label>Nombre</label>
                <input type="text" name="nombre" placeholder="Tu nombre" onChange={handleChange} />
                {errores.nombre && <span className="error">{errores.nombre}</span>}
              </div>

              <div className='campo'>
                <label>Apellido</label>
                <input type="text" name="apellido" placeholder="Tu apellido" onChange={handleChange} />
                {errores.apellido && <span className="error">{errores.apellido}</span>}
              </div>

              <div className='campo'>
                <label>Fecha de nacimiento</label>
                <input type="date" name="nacimiento" onChange={handleChange} />
                {errores.nacimiento && <span className="error">{errores.nacimiento}</span>}
              </div>

              <div className='campo'>
                <label>Telefono</label>
                <input type="tel" name="telefono" placeholder="Tu telefono" onChange={handleChange} />
                {errores.telefono && <span className="error">{errores.telefono}</span>}
              </div>

              <div className='campo'>
                <label>Correo electronico</label>
                <input type="email" name="correo" placeholder="Tu correo" onChange={handleChange} />
                {errores.correo && <span className="error">{errores.correo}</span>}
              </div>

              <div className='campo'>
                <label>Contraseña</label>
                <input type="password" name="contrasena" placeholder="Tu contraseña" onChange={handleChange} />
                {errores.contrasena && <span className="error">{errores.contrasena}</span>}
              </div>

              <div className='campo encuesta'>
                <label>¿Como te enteraste de nosotros?</label>
                <input type="text" name="encuesta" placeholder="Tu respuesta" onChange={handleChange} />
              </div>

            </div>
            <div className="botones">
              <button className="regresar">← Regresar</button>
              {/* 👇 aquí se conecta handleSiguiente */}
              <button className="siguiente" onClick={handleSiguiente}>Siguiente →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register