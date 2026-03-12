import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMe, logout } from "../../services/auth.service";
import type { MeResponseDto } from "../../types/auth.types";
import Button from "../../components/button/button";
import { Link } from "react-router-dom";

const PerfilPage = () => {
  const [user, setUser] = useState<MeResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getMe()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (loading) return <p>Cargando...</p>;

  if (!user) return <p>No se pudo cargar el perfil.</p>;

  return (
    <div>
      <h1 style={{ color: "black" }}>{user.nombre}</h1>
      <p style={{ color: "black" }}>{user.email}</p>
      <p style={{ color: "black" }}>{user.rol}</p>
      <button onClick={handleLogout}>Cerrar sesión</button>
      {(user.rol === "admin" || user.rol === "empleado") && (
        <div>
          <Link to="/admin">
            <Button>Modo Admin</Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default PerfilPage;
