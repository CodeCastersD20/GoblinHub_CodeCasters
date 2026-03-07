import { Link, useNavigate } from "react-router-dom";
import Button from "../button/button";
import "./authButton.css";

interface AuthButtonProps {
  isLoggedIn: boolean;
  onPerfil?: () => void;
  onLogout?: () => void;
  variant?: "desktop" | "mobile";
}

function AuthButton({
  isLoggedIn,
  onPerfil,
  onLogout,
  variant = "desktop",
}: AuthButtonProps) {
  const navigate = useNavigate();

  if (!isLoggedIn) {
    return (
      <Link to="/login">
        <Button className={variant === "mobile" ? "ham-login" : "nav-btn--login"}>
          Iniciar sesión
        </Button>
      </Link>
    );
  }

  return (
    <div className={`auth-${variant}`}>
      <button onClick={onPerfil}>
        👤 Mi perfil
      </button>

      <button
        className="auth-logout"
        onClick={() => {
          onLogout?.();
          navigate("/login");
        }}
      >
        🚪 Cerrar sesión
      </button>
    </div>
  );
}

export default AuthButton;