import { useNavigate } from "react-router-dom";
import "./ConfirmAccount.css";

const ConfirmAccount: React.FC = () => {
  const navigate = useNavigate();

  // En development se muestra siempre el diseño sin validar el hash
  const isDev = import.meta.env.DEV;

  const hash = new URLSearchParams(window.location.hash.substring(1));
  const type = hash.get("type");
  const accessToken = hash.get("access_token");

  const isValid = isDev || (type === "signup" && !!accessToken);

  return (
    <div className="base-confirm">
      <div className="logo-confirm">
        <img src={"/logo.png"} alt="goblin" className="goblin-confirm" />
      </div>

      <div className="form-confirm">
        {isValid ? (
          <>
            <div className="confirm-icon">✓</div>
            <label className="confirm-titulo">¡Cuenta Confirmada!</label>
            <label className="confirm-mensaje">
              Tu cuenta ha sido verificada correctamente. Ya puedes iniciar
              sesión y disfrutar de GoblinHub.
            </label>
            <button
              className="confirm-btn"
              onClick={() => {
                window.location.hash = "";
                navigate("/login");
              }}
            >
              Ir al Login
            </button>
          </>
        ) : (
          <>
            <div className="confirm-icon error">✗</div>
            <label className="confirm-titulo">Enlace inválido</label>
            <label className="confirm-mensaje">
              El enlace de confirmación no es válido o ya expiró.
            </label>
            <button className="confirm-btn" onClick={() => navigate("/")}>
              Volver al inicio
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ConfirmAccount;
