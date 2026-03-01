import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/button/button";
import "./navbar.css";

function Nav() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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
    console.log("Cerrando sesión...");
  };

  return (
    <div className="logo-container">
      <div className="Logo">
        <img src={"/logo.png"} alt="goblin" className="nav-goblin" />
      </div>

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

      <div className="usuario-wrapper" ref={dropdownRef}>
        <div
          className={`usuario ${dropdownOpen ? "usuario--active" : ""}`}
          title="Mi perfil"
          onClick={() => setDropdownOpen((prev) => !prev)}
        />

        {dropdownOpen && (
          <div className="usuario-dropdown">
            <button className="usuario-dropdown__item" onClick={handlePerfil}>
              <span className="usuario-dropdown__icon">👤</span>
              Mi perfil
            </button>
            <div className="usuario-dropdown__divider" />
            <button
              className="usuario-dropdown__item usuario-dropdown__item--danger"
              onClick={handleCerrarSesion}
            >
              <span className="usuario-dropdown__icon">🚪</span>
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Nav;
