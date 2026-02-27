import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Register from "./steps/Register";
import RegisterIntereses from "./steps/RegisterIntereses";
import RegisterConfirmacion from "./steps/RegisterConfirmacion";
import type { DatosPersonales, DatosIntereses } from "./RegisterTypes";
import { register } from "../../services/auth.service";
import type { RegisterUserDto } from "../../types/auth.types";

function RegisterFlow() {
  const [fase, setFase] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

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

  const handleCompletar = async () => {
    setError("");
    setLoading(true);
    try {
      const payload: RegisterUserDto = {
        email: datosFase1.correo,
        password: datosFase1.contrasena,
        nombre: datosFase1.nombre,
        apellidos: datosFase1.apellido,
        telefono: datosFase1.telefono || undefined,
        fecha_nacimiento: datosFase1.nacimiento,
        nivel_experiencia:
          (datosFase2.nivel as RegisterUserDto["nivel_experiencia"]) ||
          "novato",
      };
      await register(payload);
      navigate("/login");
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.message ?? "Error al registrarse")
        : "Error al registrarse";
      setError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setLoading(false);
    }
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
          loading={loading}
          error={error}
        />
      )}
    </div>
  );
}

export default RegisterFlow;
