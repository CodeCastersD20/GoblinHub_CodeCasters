import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMe } from "../../services/auth.service";
import type { MeResponseDto } from "../../types/auth.types";

const ROL_LABEL: Record<MeResponseDto["rol"], string> = {
  admin: "Administrador",
  empleado: "Empleado",
  jugador: "Jugador",
};

function Home() {
  const [user, setUser] = useState<MeResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    getMe()
      .then(({ data }) => setUser(data))
      .catch(() => {
        localStorage.removeItem("token");
        navigate("/login");
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) return <p>Cargando...</p>;
  if (!user) return null;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Bienvenido, {user.nombre}</h1>
      <p>
        Tu rol es: <strong>{ROL_LABEL[user.rol]}</strong>
      </p>
    </div>
  );
}

export default Home;
