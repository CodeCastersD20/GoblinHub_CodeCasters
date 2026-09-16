# Tutorial: tour guiado con driver.js en GoblinHub (Piloto B)

Tutorial paso a paso de cómo se eligió, instaló y de cómo se usa
**driver.js** para el tour guiado de la plataforma (spec-kit 002,
issue #160, PR #161).

## 1. ¿Qué es driver.js?

[driver.js](https://driverjs.com/) es una librería ligera (sin
dependencias) que resalta elementos de la página y muestra *popovers*
para de crear tours guiados, tutoriales y *walkthroughs*. En GoblinHub se
usa para que un primer visitante descubra las secciones clave: inicio,
productos, eventos y su cuenta.

## 2. Instalación

Desde el directorio del frontend:

```bash
cd goblinhub_web
npm i driver.js        # queda en package.json → "driver.js": "^1.8.0"
```

Se importa su hoja de estilos y la función `driver`:

```ts
import { driver, type Config, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
```

## 3. Definir los pasos del tour (DriveStep[])

Cada paso enlaza un **selector** con un **popover** (título y
descripción). En `goblinhub_web/src/components/guideTour/guideTour.tsx` se
definen pasos por vista:

```ts
const STEPS = {
  home: [
    {
      element: ".lp-hero__title",
      popover: {
        title: "La misión",
        description:
          "Wargames, juegos de mesa, rol y accesorios para tu grupo de aventureros.",
      },
    },
    // ...más pasos
  ],
} satisfies Record<string, DriveStep[]>;
```

Los selectores deben apuntar a elementos existentes en cada ruta. Si un
paso no existe se configura `skipMissingElement: true` para no romper el
tour.

## 4. Configurar y arrancar el tour

Se crea una instancia con **driver()**, se le asignan los pasos y se
ejecuta con `.drive()`:

```ts
const drive = driver({
  showProgress: true,
  smoothScroll: true,
  overlayColor: "#1e1b2e",
  nextBtnText: "Siguiente",
  prevBtnText: "Anterior",
  doneBtnText: "¡Entendido!",
  popoverClass: "gh-tour-popover",
});
drive.setSteps(getStepsForPath(pathname));
drive.drive();
```

Cuando el usuario lo termina se marca en localStorage
(`gh_guided_tour_done`) para no volver a autostartearlo.

## 5. Mostrar el botón de la guía

El componente `GuideTour` renderiza siempre un botón flotante (con
`aria-label="Mostrar guía de la plataforma"`), excepto en rutas de
autenticación (`/login`, `/register`, `/reset-password`,
`/confirm-account`):

```tsx
if (isHiddenPath) return null;

return (
  <button type="button" className="guide-tour-launcher" onClick={handleStart}>
    <span aria-hidden="true">?</span>
  </button>
);
```

## 6. Pruebas (Test-First)

El caso E2E (`e2e/tour-guiado.spec.ts`, módulo AU) valida que el botón
aparece en `/` y está ausente en `/login`:

```bash
cd goblinhub_web
npx playwright test e2e/tour-guiado.spec.ts --project=chromium   # 2 passed
```

## Referencias

- driver.js: https://driverjs.com/
- Documentación de la API: https://driverjs.com/docs/
- Código del componente: `goblinhub_web/src/components/guideTour/guideTour.tsx`
- Espec: `specs/002-tour-guiado-interactivo-driverjs/spec.md`