import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { getMe } from "../../services/auth.service";
import type { MeResponseDto } from "../../types/auth.types";

const TIENDA_COORDS = { lat: 29.0879, lng: -110.9603 };
const MAP_CONTAINER_STYLE = { width: "600px", height: "400px" };

const ROL_LABEL: Record<MeResponseDto["rol"], string> = {
  admin: "Administrador",
  empleado: "Empleado",
  jugador: "Jugador",
};

function Home() {
  const [user, setUser] = useState<MeResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "",
  });

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
      <h2>Página de inicio</h2>
      <p>
        Visítanos en nuestra tienda: Av Jalisco 8A, Centro, 83000 Hermosillo,
        Son.
      </p>
      {isLoaded ? (
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={TIENDA_COORDS}
          zoom={16}
        >
          <Marker position={TIENDA_COORDS} title="GoblinHub" />
        </GoogleMap>
      ) : (
        <p>Cargando mapa...</p>
      )}
    </div>
  );
}

export default Home;
