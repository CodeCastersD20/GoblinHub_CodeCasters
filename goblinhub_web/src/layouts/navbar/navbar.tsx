import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/button/button";
import AuthButton from "../../components/authButton/authButton";
import { getMe, logout } from "../../services/auth.service";
import "./navbar.css";
import { useLocation } from "react-router-dom";

function Nav() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const [menuAbierto, setMenuAbierto] = useState(false);

    const location = useLocation();
    if (location.pathname === "/login") return null;

  // Cargar usuario si hay token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    getMe()
      .then((res) => setNombreUsuario(res.data.nombre))
      .catch(() => setNombreUsuario(null));
  }, []);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePerfil = () => {
    setDropdownOpen(false);
    navigate("/perfil");
  };

  const handleCerrarSesion = () => {
    setDropdownOpen(false);
    logout();
    setNombreUsuario(null);
    navigate("/login");
  };

  const isLoggedIn = !!localStorage.getItem("token");

  return (
    <div className="logo-container">
      {/* Logo */}
      <div className="Logo">
        <img src={"/logo.png"} alt="goblin" className="nav-goblin" />
      </div>

      {/* Navegación desktop */}
      <div className="nav-botones">
        <Link to="/">
          <Button className="secondary">Inicio</Button>
        </Link>

        <Link to="/productos">
          <Button className="secondary">Productos</Button>
        </Link>

        <Link to="/contacto">
          <Button className="secondary">Contacto</Button>
        </Link>

        <Link to="/eventos">
          <Button className="secondary">Eventos</Button>
        </Link>
      </div>

      <button
        className="hamburguesa"
        onClick={() => setMenuAbierto(!menuAbierto)}
      >
        ☰
      </button>

      <div className={`ham-botones ${menuAbierto ? "activo" : ""}`}>
        <button
          className="ham-cerrar"
          onClick={() => setMenuAbierto(false)}
        >
          X
        </button>

        <Link to="/" onClick={() => setMenuAbierto(false)}>
          <Button className="ham-button">Inicio</Button>
        </Link>

        <Link to="/productos" onClick={() => setMenuAbierto(false)}>
          <Button className="ham-button">Productos</Button>
        </Link>

        <Link to="/contacto" onClick={() => setMenuAbierto(false)}>
          <Button className="ham-button">Contacto</Button>
        </Link>

        <Link to="/eventos" onClick={() => setMenuAbierto(false)}>
          <Button className="ham-button">Eventos</Button>
        </Link>

        <AuthButton
          variant="mobile"
          isLoggedIn={isLoggedIn}
          onPerfil={() => {
            handlePerfil();
            setMenuAbierto(false);
          }}
          onLogout={() => {
            handleCerrarSesion();
            setMenuAbierto(false);
          }}
        />
      </div>

      {/* Overlay */}
      {menuAbierto && (
        <div
          className="overlay"
          onClick={() => setMenuAbierto(false)}
        />
      )}

    
      
      {/* AuthButton desktop */}
      <div ref={dropdownRef} className="auth-desktop">
        <AuthButton
          isLoggedIn={isLoggedIn}
          variant="desktop"
          onPerfil={handlePerfil}
          onLogout={handleCerrarSesion}
        />
      </div>
    </div>
  );
}

export default Nav;