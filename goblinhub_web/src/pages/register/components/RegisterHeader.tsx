import { Fragment } from 'react'
import logo from '../../../components/logo/logo.png'
import '../register.css'

interface RegisterHeaderProps {
  faseActual: 1 | 2 | 3
}

const FASES = [
  { num: 1, label: 'Datos Básicos' },
  { num: 2, label: 'Intereses' },
  { num: 3, label: 'Confirmación' },
] as const

function RegisterHeader({ faseActual }: RegisterHeaderProps) {
  return (
    <>
      <div className="encabezado">
        <img src={logo} alt="goblin" className="goblin" />
        <h1 className="title">Únete a la Comunidad</h1>
        <p className="subtitle">Tu aventura comienza aquí</p>
      </div>
      <div className="fases">
        {FASES.map((fase, i) => {
          const estado =
            fase.num < faseActual
              ? 'completada'
              : fase.num === faseActual
                ? 'activa'
                : ''
          return (
            <Fragment key={fase.num}>
              {i > 0 && <div className="fase-linea" />}
              <div className="fase-item">
                <div className={`fase ${estado}`.trim()}>{fase.num}</div>
                <span
                  className={`fase-label ${fase.num === faseActual ? 'activa-label' : ''}`.trim()}
                >
                  {fase.label}
                </span>
              </div>
            </Fragment>
          )
        })}
      </div>
    </>
  )
}

export default RegisterHeader
