import { useState, useEffect } from "react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { Link } from "react-router-dom";
import { getEvents, type ApiEvent } from "../services/events.service";
import "./Home.css";

const TIENDA_COORDS = { lat: 29.0847174, lng: -110.9521039 };
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

const FEATURES = [
  {
    icon: "⚔️",
    title: "Wargames",
    desc: "Miniaturas, juegos de batalla y todo el universo de Warhammer.",
  },
  {
    icon: "🎲",
    title: "Juegos de Mesa",
    desc: "Los mejores títulos para reunir a tu grupo de aventureros.",
  },
  {
    icon: "🧙",
    title: "Rol & Fantasía",
    desc: "D&D, Pathfinder y más sistemas para forjar tus historias.",
  },
  {
    icon: "🎨",
    title: "Pinturas & Accesorios",
    desc: "Todo lo que necesitas para dar vida a tus miniaturas.",
  },
];

const DICE_POSITIONS = [
  { top: "8%", left: "4%", size: 52, dur: 18, delay: 0 },
  { top: "72%", left: "8%", size: 44, dur: 22, delay: -4 },
  { top: "25%", left: "22%", size: 36, dur: 16, delay: -8 },
  { top: "82%", left: "42%", size: 60, dur: 26, delay: -2 },
  { top: "12%", left: "58%", size: 48, dur: 20, delay: -6 },
  { top: "55%", left: "68%", size: 38, dur: 14, delay: -10 },
  { top: "30%", left: "80%", size: 56, dur: 24, delay: -3 },
  { top: "78%", left: "88%", size: 42, dur: 19, delay: -7 },
  { top: "50%", left: "33%", size: 34, dur: 17, delay: -5 },
  { top: "40%", left: "52%", size: 50, dur: 23, delay: -9 },
];

// Cara de dado SVG (muestra el número de puntos del 1 al 6 cíclicamente)
function DieSvg({ size, index }: { size: number; index: number }) {
  const dots: [number, number][][] = [
    [[50, 50]],
    [
      [30, 30],
      [70, 70],
    ],
    [
      [30, 30],
      [50, 50],
      [70, 70],
    ],
    [
      [30, 30],
      [70, 30],
      [30, 70],
      [70, 70],
    ],
    [
      [30, 30],
      [70, 30],
      [50, 50],
      [30, 70],
      [70, 70],
    ],
    [
      [30, 30],
      [70, 30],
      [30, 50],
      [70, 50],
      [30, 70],
      [70, 70],
    ],
  ];
  const face = dots[index % 6];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <rect
        x="5"
        y="5"
        width="90"
        height="90"
        rx="18"
        ry="18"
        fill="white"
        stroke="#6b21a8"
        strokeWidth="6"
      />
      {face.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="9" fill="#6b21a8" />
      ))}
    </svg>
  );
}

const WINNERS = [
  {
    place: 1,
    nombre: 'Carlos "El Dragón" Ruiz',
    juego: "Warhammer 40K",
    puntos: 2400,
    icon: "🥇",
  },
  {
    place: 2,
    nombre: 'María "Sombra" Pérez',
    juego: "Age of Sigmar",
    puntos: 2100,
    icon: "🥈",
  },
  {
    place: 3,
    nombre: 'Juan "Espada" Torres',
    juego: "Dungeons & Dragons",
    puntos: 1850,
    icon: "🥉",
  },
];

function Home() {
  const token = localStorage.getItem("token");
  const [nextEvent, setNextEvent] = useState<ApiEvent | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);

  useEffect(() => {
    getEvents()
      .then(({ data }) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcoming = data
          .filter((e) => new Date(e.fecha) >= today)
          .sort(
            (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
          );
        setNextEvent(upcoming[0] ?? null);
      })
      .catch(() => setNextEvent(null))
      .finally(() => setLoadingEvent(false));
  }, []);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: API_KEY ?? "",
  });

  return (
    <div className="lp-page">
      {/* ── Dados flotantes de fondo ── */}
      <div className="lp-dice-bg" aria-hidden="true">
        {DICE_POSITIONS.map((p, i) => (
          <span
            key={i}
            className="lp-die"
            style={{
              top: p.top,
              left: p.left,
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
            }}
          >
            <DieSvg size={p.size} index={i} />
          </span>
        ))}
      </div>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <img src="/logo.png" alt="GoblinHub" className="lp-hero__logo" />
        <span className="lp-hero__brand">GoblinHub</span>
        <h1 className="lp-hero__title">
          Tu tienda de juegos
          <br />
          en Hermosillo
        </h1>
        <p className="lp-hero__subtitle">
          Wargames, juegos de mesa, rol y accesorios. Todo lo que necesita un
          verdadero aventurero.
        </p>
        <div className="lp-hero__ctas">
          <Link to="/productos" className="lp-btn lp-btn--primary">
            Ver inventario
          </Link>
          <Link to="/eventos" className="lp-btn lp-btn--secondary">
            Próximos eventos
          </Link>
        </div>
      </section>

      {/* ── Categorías ── */}
      <section className="lp-features">
        <h2 className="lp-section-title">¿Qué encontrarás aquí?</h2>
        <div className="lp-features__grid">
          {FEATURES.map((f) => (
            <div className="lp-feature-card" key={f.title}>
              <span className="lp-feature-card__icon">{f.icon}</span>
              <h3 className="lp-feature-card__title">{f.title}</h3>
              <p className="lp-feature-card__desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Últimos 3 ganadores ── */}
      <section className="lp-winners">
        <h2 className="lp-section-title">🏆 Últimos Campeones</h2>
        <div className="lp-winners__grid">
          {WINNERS.map((w) => (
            <div
              className={`lp-winner-card lp-winner-card--${w.place}`}
              key={w.place}
            >
              <span className="lp-winner-card__icon">{w.icon}</span>
              <p className="lp-winner-card__place">#{w.place} lugar</p>
              <p className="lp-winner-card__nombre">{w.nombre}</p>
              <p className="lp-winner-card__juego">{w.juego}</p>
              <p className="lp-winner-card__puntos">{w.puntos} pts</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Próximo evento ── */}
      <section className="lp-next-event">
        <h2 className="lp-section-title">📅 Próximo Evento</h2>
        {loadingEvent ? (
          <p className="lp-map-placeholder">Cargando evento...</p>
        ) : nextEvent ? (
          <div className="lp-next-event__card">
            <div className="lp-next-event__badge">{nextEvent.tipo_evento}</div>
            <h3 className="lp-next-event__title">{nextEvent.titulo}</h3>
            <div className="lp-next-event__meta">
              <span>
                📆{" "}
                {new Date(nextEvent.fecha).toLocaleDateString("es-MX", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <span>
                🕐{" "}
                {new Date(nextEvent.hora_inicio).toLocaleTimeString("es-MX", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span>👥 {nextEvent.cupo_maximo} cupos</span>
            </div>
            <div className="lp-next-event__actions">
              {token ? (
                <Link
                  to={`/eventos/${nextEvent.id}`}
                  className="lp-btn lp-btn--primary lp-next-event__cta"
                >
                  Ver evento
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="lp-btn lp-btn--primary lp-next-event__cta"
                >
                  Inicia sesión para ver el evento
                </Link>
              )}
              <Link
                to="/eventos"
                className="lp-btn lp-btn--secondary lp-next-event__cta"
              >
                Ver todos
              </Link>
            </div>
          </div>
        ) : (
          <div className="lp-next-event__card">
            <p style={{ color: "var(--lp-muted)", margin: 0 }}>
              No hay eventos próximos por el momento.
            </p>
            <Link
              to="/eventos"
              className="lp-btn lp-btn--secondary lp-next-event__cta"
            >
              Ver todos los eventos
            </Link>
          </div>
        )}
      </section>

      {/* ── Ubicación ── */}
      <section className="lp-store">
        <h2 className="lp-section-title">🗺️ Encuéntranos</h2>
        <p className="lp-store__address">
          Av Jalisco 8A, Centro, 83000 Hermosillo, Sonora
        </p>
        <div className="lp-map-container" data-testid="map-section">
          {!API_KEY ? (
            <p className="lp-map-placeholder">
              Mapa no disponible (falta API Key)
            </p>
          ) : isLoaded ? (
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "400px" }}
              center={TIENDA_COORDS}
              zoom={16}
            >
              <Marker position={TIENDA_COORDS} title="GoblinHub" />
            </GoogleMap>
          ) : (
            <p className="lp-map-placeholder">Cargando mapa...</p>
          )}
        </div>
      </section>
    </div>
  );
}

export default Home;
