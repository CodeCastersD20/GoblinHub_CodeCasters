import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Login.css";
import logo from "../../components/logo/logo.png";
import { login } from "../../services/auth.service";

const Login: React.FC = () => {
  const [forgotPassword, setForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const { data } = await login(email, password);
      localStorage.setItem("token", data.access_token);
      navigate("/auth-home");
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.message ?? "Correo o contraseña incorrectos")
        : "Correo o contraseña incorrectos";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="base-login">
      <div className="logo-login">
        {forgotPassword && (
          <span className="volver" onClick={() => setForgotPassword(false)}>
            ← Volver al login
          </span>
        )}
        <img src={logo} alt="goblin" className="goblin-login" />
      </div>

      {!forgotPassword ? (
        // ——— VISTA LOGIN ———
        <div className="form-login">
          <label className="inicio-sesion">Iniciar sesión</label>
          <input
            type="text"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <span className="error-msg">{error}</span>}
          <span className="contraseña" onClick={() => setForgotPassword(true)}>
            ¿Olvidaste tu contraseña?
          </span>
          <button className="entrar" onClick={handleLogin} disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
          <p>¿No tienes una cuenta?</p>
          <a href="/register">Regístrate aquí</a>
        </div>
      ) : (
        // ——— VISTA RECUPERAR CONTRASEÑA ———
        <div className="form-login">
          <label className="inicio-sesion">Recuperar Contraseña</label>
          <label className="instrucciones">
            Ingresa tu correo electrónico y te enviaremos un código para
            restablecer tu contraseña.
          </label>
          <input type="text" placeholder="Correo electrónico" />
          <div className="botones">
            <button className="entrar">Enviar Código</button>
            <button
              className="cancelar"
              onClick={() => setForgotPassword(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
