import { useState } from "react";
import Register from "./steps/Register";
import RegisterIntereses from "./steps/RegisterIntereses";
import RegisterConfirmacion from "./steps/RegisterConfirmacion";
import type { DatosPersonales, DatosIntereses } from "./RegisterTypes";

function RegisterFlow() {
  const [fase, setFase] = useState(1);

  const [datosFase1, setDatosFase1] = useState<DatosPersonales>({
    nombre: "",
    apellido: "",
    nacimiento: "",
    telefono: "",
    correo: "",
    contrasena: "",
    encuesta: "",
  });

  const [datosFase2, setDatosFase2] = useState<DatosIntereses>({
    nivel: "",
    juegos: [],
    juegosEspecificos: "",
    dias: [],
  });

  const handleCompletar = () => {
    console.log("Registro completado:", { datosFase1, datosFase2 });
    // aquí puedes hacer el fetch/POST a tu backend
    alert("¡Registro completado!");
  };

  return (
    <div>
      {fase === 1 && (
        <Register
          onSiguiente={(datos) => {
            setDatosFase1(datos);
            setFase(2);
          }}
        />
      )}
      {fase === 2 && (
        <RegisterIntereses
          onSiguiente={(datos) => {
            setDatosFase2(datos);
            setFase(3);
          }}
          onAnterior={() => setFase(1)}
        />
      )}
      {fase === 3 && (
        <RegisterConfirmacion
          onAnterior={() => setFase(2)}
          onCompletar={handleCompletar}
          datos={datosFase1}
          intereses={datosFase2}
        />
      )}
    </div>
  );
}

export default RegisterFlow;
