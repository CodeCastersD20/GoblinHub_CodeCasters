# Plantilla de arquitectura frontend (React + TS + Vite)

Patrón genérico, reusable en cualquier proyecto nuevo. No depende de nombres de dominio específicos.

## Stack base

- React + TypeScript
- Vite (bundler/dev server)
- React Router (routing)
- Cliente HTTP (axios u otro) centralizado en un único módulo
- Vitest + Testing Library (unit/component tests)
- Playwright (e2e tests)
- ESLint + typescript-eslint

## Scripts estándar

```
dev       → levanta dev server
build     → typecheck + build producción
lint      → linter
test      → tests unitarios
test:e2e  → tests end-to-end
ci/gate   → lint + typecheck + test + build en un solo comando
```

## Estructura de carpetas (src/)

```
src/
├── App.tsx                    → define TODAS las rutas (router central)
├── App.css                    → estilos globales app
├── main.tsx                   → entry point, monta <App/> en DOM
├── index.css                  → variables CSS globales + reset
│
├── assets/
│   └── (imágenes, iconos, fuentes)   → sin subcarpetas fijas, agrupar por tipo si crece: assets/images/, assets/icons/
│
├── components/                → genérico, SIN lógica de negocio, reusable en cualquier página
│   ├── ProtectedRoute.tsx     → (ejemplo: guard de rutas, sin carpeta propia si es 1 archivo simple)
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.css         (o .module.css)
│   │   └── Button.test.tsx
│   └── <OtroComponenteX>/
│       ├── OtroComponenteX.tsx
│       ├── OtroComponenteX.css
│       └── OtroComponenteX.test.tsx
│
├── features/                  → UI + lógica específica de UN dominio, no reusable fuera
│   └── <nombreFeature>/       (ej: landing, checkout, dashboard)
│       └── components/
│           └── <SeccionX>/
│               ├── SeccionX.tsx
│               └── SeccionX.css
│
├── layouts/                   → wrappers compartidos (shell de la app)
│   └── <nombreLayout>/        (ej: navbar, sidebar, footer)
│       ├── <nombreLayout>.tsx
│       └── <nombreLayout>.css
│
├── lib/                       → SOLO config/infra de bajo nivel, nunca lógica de dominio
│   └── api.ts                 → instancia única del cliente HTTP (baseURL, interceptors, auth headers)
│
├── pages/                     → UNA carpeta por ruta; sub-rutas anidan sub-carpetas mismo patrón
│   ├── Home.tsx                       (página simple sin sub-rutas: archivo suelto está bien)
│   ├── <nombrePagina>/                (ej: login, register, products)
│   │   ├── <NombrePagina>.tsx
│   │   ├── <NombrePagina>.css
│   │   ├── <NombrePagina>.test.tsx
│   │   └── <SubRuta>/                 (ej: products/ProductDetail/)
│   │       ├── <SubRuta>.tsx
│   │       └── <SubRuta>.css
│   └── admin/  (o "administracion/")  → si hay panel admin, mismo patrón anidado recursivo
│       └── <moduloAdmin>/
│           └── <ModuloAdmin>.tsx
│
├── services/                  → 1 archivo por entidad/dominio, funciones que llaman a la API
│   ├── auth.service.ts        → login, register, getMe, logout...
│   ├── <entidad>.service.ts   → CRUD de esa entidad, usa lib/api.ts, nunca fetch directo
│   └── ...
│
├── hooks/                     → custom hooks reusables cross-feature
│   ├── useDebounce.ts
│   └── use<Algo>.ts
│
├── test/
│   └── setup.ts                → config global Vitest + Testing Library (matchers, jsdom)
│
└── types/
    └── <dominio>.types.ts      → interfaces/tipos compartidos por 2+ módulos
```

**Regla de anidación**: si una página tiene sub-vistas (detalle, edición, admin de esa página), esas sub-vistas van en subcarpeta DENTRO de la carpeta de la página padre — nunca en `pages/` a nivel plano.

**Fuera de `src/`**, en raíz del proyecto:

```
e2e/
└── <flujo>.spec.ts   → tests Playwright, 1 archivo por flujo/página crítica
```

## Reglas de diseño (aplicables a cualquier dominio)

1. **Una carpeta por componente/página con estilos propios**:
   ```
   NombreX/
   ├── NombreX.tsx
   ├── NombreX.css        (o .module.css si es reusable/aislado)
   └── NombreX.test.tsx   (si aplica)
   ```
2. **Anidación refleja jerarquía de rutas**: sub-flujos de una página viven en subcarpetas dentro de la carpeta padre, no en un nivel plano.
3. **Capa `services/` obligatoria entre UI y red**: componentes/páginas nunca llaman al cliente HTTP directo; siempre pasan por un `*.service.ts` que usa el cliente de `lib/`.
4. **`components/` vs `features/`**: `components/` = genérico, sin conocimiento de negocio, usable en cualquier página. `features/` = agrupa UI + lógica específica de un dominio que no se reusa fuera de ese contexto.
5. **Tests junto al código que prueban** (mismo directorio), tests e2e separados en `e2e/` en la raíz del proyecto, fuera de `src/`.
6. **`lib/` sólo config/infra** (instancias de cliente, wrappers), nunca lógica de dominio.
7. **Un `types/` compartido** para contratos usados por 2+ módulos; tipos locales de un solo componente quedan en su propio archivo.

## Cómo aplicar en proyecto nuevo

1. Crear estructura de carpetas base arriba (vacías está bien).
2. Definir cliente HTTP único en `lib/api.ts` (baseURL, interceptors, auth headers).
3. Por cada entidad de dominio (ej. usuarios, productos, X): un archivo en `services/` con sus funciones CRUD.
4. Por cada ruta: una carpeta en `pages/` siguiendo regla 1; registrar en el router central (ej. `App.tsx`).
5. Extraer a `components/` sólo lo que se repite en ≥2 páginas sin lógica de dominio.
6. Gate de CI: lint + typecheck + test + build antes de mergear.
