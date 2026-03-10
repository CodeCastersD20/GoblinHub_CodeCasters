import { useState } from "react";
import "../register.css";
import RegisterHeader from "../components/RegisterHeader";
import type { DatosPersonales } from "../RegisterTypes";

interface RegisterProps {
  onSiguiente: (datos: DatosPersonales) => void;
}

function Register({ onSiguiente }: RegisterProps) {
  const [form, setForm] = useState<DatosPersonales>({
    nombre: "",
    apellido: "",
    nacimiento: "",
    telefono: "",
    correo: "",
    contrasena: "",
    encuesta: "",
  });

  const [errores, setErrores] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validar = () => {
    const nuevosErrores: Record<string, string> = {};
    if (!form.nombre.trim()) nuevosErrores.nombre = "El nombre es requerido";
    if (!form.apellido.trim())
      nuevosErrores.apellido = "El apellido es requerido";
    if (!form.nacimiento) nuevosErrores.nacimiento = "La fecha es requerida";
    if (!form.telefono.trim())
      nuevosErrores.telefono = "El teléfono es requerido";
    if (!form.correo.trim()) nuevosErrores.correo = "El correo es requerido";
    else if (!/\S+@\S+\.\S+/.test(form.correo))
      nuevosErrores.correo = "Correo inválido";
    if (!form.contrasena.trim())
      nuevosErrores.contrasena = "La contraseña es requerida";
    else if (form.contrasena.length < 6)
      nuevosErrores.contrasena = "Mínimo 6 caracteres";
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSiguiente = () => {
    if (validar()) onSiguiente(form);
  };

  return (
    <div className="register-wrapper">
      <div className="base">
        <RegisterHeader faseActual={1} />
        <div className="formulario">
          <div className="datos-personales">
            <h2 className="titulo-datos">Información personal</h2>
            <h3 className="subtitulo-datos">Cuéntanos sobre ti</h3>
            <div className="datos">
              <div className="campo">
                <label>Nombre</label>
                <input
                  type="text"
                  name="nombre"
                  placeholder="Tu nombre"
                  onChange={handleChange}
                />
                {errores.nombre && (
                  <span className="error">{errores.nombre}</span>
                )}
              </div>

              <div className="campo">
                <label>Apellido</label>
                <input
                  type="text"
                  name="apellido"
                  placeholder="Tu apellido"
                  onChange={handleChange}
                />
                {errores.apellido && (
                  <span className="error">{errores.apellido}</span>
                )}
              </div>

              <div className="campo">
                <label>Fecha de nacimiento</label>
                <input type="date" name="nacimiento" onChange={handleChange} />
                {errores.nacimiento && (
                  <span className="error">{errores.nacimiento}</span>
                )}
              </div>

              <div className="campo">
                <label>Telefono</label>
                <input
                  type="tel"
                  name="telefono"
                  placeholder="Tu telefono"
                  onChange={handleChange}
                />
                {errores.telefono && (
                  <span className="error">{errores.telefono}</span>
                )}
              </div>

              <div className="campo">
                <label>Correo electronico</label>
                <input
                  type="email"
                  name="correo"
                  placeholder="Tu correo"
                  onChange={handleChange}
                />
                {errores.correo && (
                  <span className="error">{errores.correo}</span>
                )}
              </div>

              <div className="campo">
                <label>Contraseña</label>
                <input
                  type="password"
                  name="contrasena"
                  placeholder="Tu contraseña"
                  onChange={handleChange}
                />
                {errores.contrasena && (
                  <span className="error">{errores.contrasena}</span>
                )}
              </div>

              <div className="campo encuesta">
                <label>¿Como te enteraste de nosotros?</label>
                <input
                  type="text"
                  name="encuesta"
                  placeholder="Tu respuesta"
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="botones">
              <button className="regresar">← Regresar</button>
              {/* 👇 aquí se conecta handleSiguiente */}
              <button className="siguiente" onClick={handleSiguiente}>
                Siguiente →
              </button>
              {/* eliminar el botón 'regresar' si no hay fase anterior */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
