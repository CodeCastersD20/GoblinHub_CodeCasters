import { useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { driver, type Config, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import "./guideTour.css";

const TOUR_DONE_KEY = "gh_guided_tour_done";

const TOUR_HIDDEN_PATHS = [
  "/login",
  "/register",
  "/reset-password",
  "/confirm-account",
];

const CONFIG: Config = {
  showProgress: true,
  animate: true,
  smoothScroll: true,
  overlayColor: "#1e1b2e",
  overlayOpacity: 0.6,
  stagePadding: 8,
  stageRadius: 14,
  skipMissingElement: true,
  nextBtnText: "Siguiente",
  prevBtnText: "Anterior",
  doneBtnText: "¡Entendido!",
  progressText: "Paso {{current}} de {{total}}",
  popoverClass: "gh-tour-popover",
};

const STEPS = {
  general: [
    {
      element: ".Logo",
      popover: {
        title: "Bienvenido a GoblinHub 🧙",
        description:
          "La guarida del goblin para amantes de los wargames, el rol y los juegos de mesa.",
      },
    },
    {
      element: '.nav-botones a[href="/productos"]',
      popover: {
        title: "Productos",
        description:
          "Explora el inventario: wargames, rol, ¡mesa, pinturas y accesorios.",
      },
    },
    {
      element: '.nav-botones a[href="/eventos"]',
      popover: {
        title: "Eventos",
        description:
          "Consulta el calendario de torneos, talleres y sesiones de rol.",
      },
    },
    {
      element: ".usuario-wrapper",
      popover: {
        title: "Tu cuenta",
        description:
          "Inicia sesión o accede a tu perfil para seguir tus eventos y puntos.",
      },
    },
  ],
  home: [
    {
      element: ".Logo",
      popover: {
        title: "Bienvenido a GoblinHub 🧙",
        description:
          "Tu tienda de juegos en Hermosillo. Este tour te mostrará lo esencial.",
      },
    },
    {
      element: ".lp-hero__title",
      popover: {
        title: "La misión",
        description:
          "Wargames, juegos de mesa, rol y accesorios para tu grupo de aventureros.",
      },
    },
    {
      element: ".lp-hero__ctas",
      popover: {
        title: "Atajos rápidos",
        description: "Entra directo al inventario o mira los próximos eventos.",
      },
    },
    {
      element: ".lp-next-event",
      popover: {
        title: "Próximo evento",
        description:
          "Aquí siempre verás el siguiente torneo o actividad de la guarida.",
      },
    },
    {
      element: ".lp-store",
      popover: {
        title: "¿Dónde están?",
        description:
          "Mapa con la ubicación de la tienda. ¡Te esperamos con dados y café!",
      },
    },
  ],
  productos: [
    {
      element: ".products-title",
      popover: {
        title: "Inventario",
        description:
          "Todos los productos de la guarida con stock en tiempo real.",
      },
    },
    {
      element: ".list-category",
      popover: {
        title: "Filtra por categoría",
        description:
          "Con un clic filtra wargames, juego de rol, mesa, pinturas o accesorios.",
      },
    },
    {
      element: ".products-grid",
      popover: {
        title: "La carta del producto",
        description:
          "Cada tarjeta te lleva al detalle del producto para verlo mejor.",
      },
    },
  ],
  eventos: [
    {
      element: ".ca-title",
      popover: {
        title: "Calendario de aventuras",
        description:
          "Torneos, iniciaciones, talleres de pintura y sesiones de rol.",
      },
    },
    {
      element: ".ca-events",
      popover: {
        title: "Las actividades",
        description:
          "Cada tarjeta muestra fecha, hora, lugar, cupo y costo del evento.",
      },
    },
    {
      element: ".ca-btn--inscribirse",
      popover: {
        title: "Inscríbete",
        description:
          "Guarda tu lugar en los eventos a los que quieras asistir.",
      },
      skipMissingElement: true,
    },
  ],
} satisfies Record<string, DriveStep[]>;

function getStepsForPath(pathname: string): DriveStep[] {
  if (pathname === "/") return [...STEPS.general, ...STEPS.home];
  if (pathname.startsWith("/productos")) return STEPS.productos;
  if (pathname.startsWith("/eventos")) return STEPS.eventos;
  return STEPS.general;
}

function markTourDone() {
  localStorage.setItem(TOUR_DONE_KEY, "done");
}

function startGuidedTour(pathname: string) {
  const steps = getStepsForPath(pathname);
  if (steps.length === 0) return;

  const drive = driver({
    ...CONFIG,
    onDestroyed: markTourDone,
  });
  drive.setSteps(steps);
  drive.drive();
}

export function GuideTour() {
  const location = useLocation();
  const isHiddenPath = TOUR_HIDDEN_PATHS.some((path) =>
    location.pathname.startsWith(path),
  );

  const handleStart = useCallback(() => {
    startGuidedTour(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    if (isHiddenPath) return;
    if (location.pathname !== "/") return;
    if (localStorage.getItem(TOUR_DONE_KEY)) return;

    const timer = window.setTimeout(() => startGuidedTour("/"), 600);
    return () => window.clearTimeout(timer);
  }, [isHiddenPath, location.pathname]);

  if (isHiddenPath) return null;

  return (
    <button
      type="button"
      className="guide-tour-launcher"
      onClick={handleStart}
      aria-label="Mostrar guía de la plataforma"
      title="¿Cómo funciona GoblinHub?"
    >
      <span aria-hidden="true">?</span>
    </button>
  );
}

export default GuideTour;