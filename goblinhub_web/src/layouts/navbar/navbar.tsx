import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Button from "../../components/button/button";
import { logout } from "../../services/auth.service";
import "./navbar.css";

function Nav() {

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [usuarioAbierto, setUsuarioAbierto] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const isLoggedIn = !!localStorage.getItem("token");

  // cerrar dropdown al hacer click fuera
  useEffect(() => {

    function handleClickOutside(e: MouseEvent) {

      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setUsuarioAbierto(false);
      }

    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);

  }, []);

  if (location.pathname === "/login") return null;

  const handlePerfil = () => {

    navigate("/perfil");
    setUsuarioAbierto(false);

  };

  const handleCerrarSesion = () => {

    logout();
    navigate("/login");

  };

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

      {/* BOTÓN USUARIO */}

      <div className="usuario-wrapper" ref={dropdownRef}>

        {isLoggedIn ? (

          <>
          
            <button
              className={`usuario ${usuarioAbierto ? "usuario--active" : ""}`}
              onClick={() => setUsuarioAbierto(!usuarioAbierto)}
            >
              👤
            </button>

            {usuarioAbierto && (

              <div className="usuario-dropdown">

                <button
                  className="usuario-dropdown__item"
                  onClick={handlePerfil}
                >
                  Mi perfil
                </button>

                <div className="usuario-dropdown__divider"></div>

                <button
                  className="usuario-dropdown__item"
                  onClick={handleCerrarSesion}
                >
                  Cerrar sesión
                </button>

              </div>

            )}

          </>

        ) : (

          <Button
            className="nav-btn--login"
            onClick={() => navigate("/login")}
          >
            Iniciar sesión
          </Button>

        )}

      </div>

      {/* BOTÓN HAMBURGUESA */}

      <button
        className="hamburguesa"
        onClick={() => setMenuAbierto(!menuAbierto)}
      >
        ☰
      </button>

      {/* MENÚ MÓVIL */}

      <div className={`ham-botones ${menuAbierto ? "activo" : ""}`}>

        <button
          className="ham-cerrar"
          onClick={() => setMenuAbierto(false)}
        >
          ✕
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

        {isLoggedIn && (

          <>
          
            <Button
              className="ham-button"
              onClick={handlePerfil}
            >
              Mi perfil
            </Button>

            <Button
              className="ham-button"
              onClick={handleCerrarSesion}
            >
              Cerrar sesión
            </Button>

          </>

        )}

      </div>

      {menuAbierto && (
        <div
          className="overlay"
          onClick={() => setMenuAbierto(false)}
        />
      )}

    </div>

  );

}

export default Nav;