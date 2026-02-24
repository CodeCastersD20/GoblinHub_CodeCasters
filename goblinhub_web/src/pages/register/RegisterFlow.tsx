import { useState } from 'react'
import Register from './Register'
import Register2 from './Register2'
import Register3 from './Register3'

function RegisterFlow() {
  const [fase, setFase] = useState(1)

  // Estado compartido entre fases
  const [datosFase1, setDatosFase1] = useState({
    nombre: '',
    apellido: '',
    nacimiento: '',
    telefono: '',
    correo: '',
    contrasena: '',
    encuesta: ''
  })

  const [datosFase2, setDatosFase2] = useState({
    nivel: '',
    juegos: [] as string[],
    juegosEspecificos: '',
    dias: [] as string[]
  })

  const handleCompletar = () => {
    console.log('Registro completado:', { datosFase1, datosFase2 })
    // aquí puedes hacer el fetch/POST a tu backend
    alert('¡Registro completado!')
  }

  return (
    <div>
      {fase === 1 && (
        <Register
          onSiguiente={(datos) => {
            setDatosFase1(datos)
            setFase(2)
          }}
        />
      )}
      {fase === 2 && (
        <Register2
          onSiguiente={(datos) => {
            setDatosFase2(datos)
            setFase(3)
          }}
          onAnterior={() => setFase(1)}
        />
      )}
      {fase === 3 && (
        <Register3
          onAnterior={() => setFase(2)}
          onCompletar={handleCompletar}
          datos={datosFase1}
          intereses={datosFase2}
        />
      )}
    </div>
  )
}

export default RegisterFlow