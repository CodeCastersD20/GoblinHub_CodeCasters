import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { getMe } from "../../services/auth.service";
import type { MeResponseDto } from "../../types/auth.types";
import "./Home.css";

const TIENDA_COORDS = { lat: 29.0879, lng: -110.9603 };
const MAP_CONTAINER_STYLE = { width: "100%", height: "400px" };

const ROL_LABEL: Record<MeResponseDto["rol"], string> = {
  admin: "Administrador",
  empleado: "Empleado",
  jugador: "Jugador",
};

const NIVEL_LABEL: Record<string, string> = {
  novato: "Novato",
  intermedio: "Intermedio",
  veterano: "Veterano",
};

function AuthHome() {
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

  if (loading)
    return (
      <div className="ah-loading">
        <p>Cargando...</p>
      </div>
    );
  if (!user) return null;

  return (
    <div className="ah-page">
      {/* Hero */}
      <section className="ah-hero">
        <span className="ah-hero__badge">⚔️ Portal de Aventurero</span>
        <h1 className="ah-hero__title">¡Bienvenido, {user.nombre}!</h1>
        <p className="ah-hero__subtitle">
          Tu guarida de juegos favorita en Hermosillo
        </p>
      </section>

      {/* Tarjetas de estadísticas */}
      <section className="ah-stats">
        <div className="ah-stat-card">
          <span className="ah-stat-card__icon">🎭</span>
          <p className="ah-stat-card__label">Rol</p>
          <p className="ah-stat-card__value">{ROL_LABEL[user.rol]}</p>
        </div>
        <div className="ah-stat-card">
          <span className="ah-stat-card__icon">⭐</span>
          <p className="ah-stat-card__label">Puntos de Fidelidad</p>
          <p className="ah-stat-card__value">{user.puntos_fidelidad ?? 0}</p>
        </div>
        {user.nivel_experiencia && (
          <div className="ah-stat-card">
            <span className="ah-stat-card__icon">🧙</span>
            <p className="ah-stat-card__label">Nivel</p>
            <p className="ah-stat-card__value">
              {NIVEL_LABEL[user.nivel_experiencia] ?? user.nivel_experiencia}
            </p>
          </div>
        )}
      </section>

      {/* Tienda y mapa */}
      <section className="ah-store">
        <h2 className="ah-store__title">🗺️ Visítanos</h2>
        <p className="ah-store__address">
          Av Jalisco 8A, Centro, 83000 Hermosillo, Son.
        </p>
        <div className="ah-map-container" data-testid="map-section">
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={MAP_CONTAINER_STYLE}
              center={TIENDA_COORDS}
              zoom={16}
            >
              <Marker position={TIENDA_COORDS} title="GoblinHub" />
            </GoogleMap>
          ) : (
            <p className="ah-map-loading">Cargando mapa...</p>
          )}
        </div>
      </section>
    </div>
  );
}

export default AuthHome;
