# GoblinHub Web — Documentación Técnica

> **Versión**: 0.0.0 &nbsp;|&nbsp; **Framework**: React 19 + TypeScript &nbsp;|&nbsp; **Build**: Vite &nbsp;|&nbsp; **Router**: React Router v7 &nbsp;|&nbsp; **Tests**: Vitest + Testing Library + Playwright

---

## Tabla de Contenidos

1. [Visión General](#1-visión-general)
2. [Estructura del Proyecto](#2-estructura-del-proyecto)
3. [Rutas y Navegación](#3-rutas-y-navegación)
4. [Autenticación](#4-autenticación)
5. [Servicios y API](#5-servicios-y-api)
6. [Componentes y Páginas](#6-componentes-y-páginas)
7. [Gestión de Estado](#7-gestión-de-estado)
8. [Seguridad](#8-seguridad)
9. [Testing](#9-testing)
10. [Variables de Entorno](#10-variables-de-entorno)
11. [Scripts útiles](#11-scripts-útiles)

---

## 1. Visión General

GoblinHub Web es el frontend de la plataforma GoblinHub. Es una SPA (Single Page Application) construida con React 19 y TypeScript que consume la GoblinHub API.

**Funcionalidades principales**:

- Landing page con mapa, próximos eventos y tabla de líderes de puntos de fidelidad.
- Landing page con mapa, próximo evento y bloque visual de campeones destacados.
- Catálogo de productos con filtros por categoría.
- Calendario de eventos con navegación a detalle e intención de inscripción desde la UI.
- Sistema de autenticación completo (registro, login, recuperación de contraseña, confirmación de cuenta).
- Perfil de usuario con edición de datos y foto.
- Panel de administración para gestión operativa y analítica (roles admin/empleado).
- Panel administrativo ampliado con usuarios, reportes analíticos, logs del sistema y módulo de novatos.

---

## 2. Estructura del Proyecto

```
src/
├── App.tsx                   # Definición de todas las rutas (React Router)
├── App.css                   # Estilos globales de la app
├── main.tsx                  # Entry point — monta <App/> en el DOM
├── index.css                 # Variables CSS globales y reset
│
├── assets/                   # Imágenes, iconos, fuentes estáticas
│
├── components/               # Componentes reutilizables y transversales
│   ├── ProtectedRoute.tsx    # Guard de rutas privadas
│   ├── authButton/           # Botón de login/logout contextual
│   └── button/               # Botón genérico con variantes
│
├── features/                 # Features autocontenidas (patrón feature-sliced)
│   └── landing/
│       └── components/       # Secciones de la landing page
│
├── layouts/
│   └── navbar/               # Barra de navegación global
│
├── lib/
│   └── api.ts                # Instancia de Axios con interceptores
│
├── pages/                    # Una carpeta por página/ruta
│   ├── Home.tsx              # Landing page principal
│   ├── aboutUs/              # Página de contacto y equipo
│   ├── confirmAccount/       # Confirmación de nueva cuenta
│   ├── Events/               # Listado y detalle de eventos
│   ├── login/                # Formulario de login y forgot-password
│   ├── perfil/               # Perfil de usuario y panel admin
│   ├── products/             # Catálogo y detalle de productos
│   ├── register/             # Flujo de registro multi-fase
│   └── resetPassword/        # Cambio de contraseña via token
│
├── services/
│   ├── auth.service.ts       # Llamadas a /auth/*
│   ├── events.service.ts     # Llamadas a /events/* y CRUD administrativo de eventos
│   ├── logs.service.ts       # Consulta de logs administrativos
│   ├── reportes.service.ts   # Métricas agregadas para dashboard
│   └── users-admin.service.ts# Gestión administrativa de usuarios
│
├── hooks/
│   ├── useDebounce.ts        # Debounce reutilizable para inputs reactivos
│   └── useLogs.ts            # Hook de fetch con estados para logs
│
├── test/
│   └── setup.ts              # Configuración de Vitest + Testing Library
│
└── types/
    └── auth.types.ts         # Interfaces TypeScript de auth y usuario
```

### Estructura administrativa real

Dentro de `pages/` existen además módulos administrativos no reflejados en la versión inicial de esta documentación:

- `pages/admin/logs/` → visor de logs del sistema
- `pages/perfil/administracion/eventos/` → CRUD de eventos
- `pages/perfil/administracion/usuarios/` → administración y búsqueda de usuarios
- `pages/perfil/administracion/reportes/` → dashboard analítico con gráficas
- `pages/perfil/administracion/novatos/` → módulo de capacitación de novatos
- `pages/perfil/administracion/Administracion.tsx` → dashboard principal del panel

---

## 3. Rutas y Navegación

Las rutas se definen centralizadamente en `App.tsx` usando React Router v7.

### Rutas públicas

| Ruta               | Componente     | Descripción                      |
| ------------------ | -------------- | -------------------------------- |
| `/`                | `Home`         | Landing page                     |
| `/productos`       | Products       | Catálogo de productos            |
| `/productos/:id`   | ProductDetail  | Detalle de un producto           |
| `/eventos`         | Events         | Listado de eventos               |
| `/eventos/:id`     | EventDetail    | Detalle de un evento             |
| `/contacto`        | AboutUs        | Información de contacto y equipo |
| `/login`           | Login          | Formulario de login              |
| `/register`        | Register       | Registro multi-fase              |
| `/reset-password`  | ResetPassword  | Cambio de contraseña con token   |
| `/confirm-account` | ConfirmAccount | Confirmación de cuenta nueva     |
| `/eventosAdmin`    | EventsAdmin    | Vista administrativa de eventos  |
| `/verEvento/:id`   | VerEvento      | Vista administrativa de detalle  |
| `/usuariosAdmin`   | UsuariosAdmin  | Administración de usuarios       |

### Rutas protegidas (requieren JWT)

Están envueltas en `<ProtectedRoute>`, que verifica el token antes de renderizar:

| Ruta              | Componente          | Roles                         |
| ----------------- | ------------------- | ----------------------------- |
| `/perfil`         | PerfilPage          | Cualquier usuario autenticado |
| `/administration` | Administration      | Cualquier usuario autenticado |
| `/admin/reportes` | Reportes            | Cualquier usuario autenticado |
| `/admin/novatos`  | CapacitacionNovatos | Cualquier usuario autenticado |

### Rutas protegidas con restricción de rol

Están envueltas en `<ProtectedRoute allowedRoles={...}>`:

| Ruta             | Componente          | Roles |
| ---------------- | ------------------- | ----- |
| `/admin`         | Administration      | admin |
| `/admin/logs`    | LogsAdmin           | admin |
| `/eventosAdmin`  | EventsAdmin         | admin |
| `/verEvento/:id` | VerEvento           | admin |
| `/usuariosAdmin` | UsuariosAdmin       | admin |
| `/admin/novatos` | CapacitacionNovatos | admin |

### Observación técnica sobre el enrutado actual

En `App.tsx` algunas rutas administrativas (`/eventosAdmin`, `/verEvento/:id`, `/usuariosAdmin`) aparecen declaradas tanto fuera como dentro de bloques protegidos. La intención funcional del proyecto es claramente administrativa, pero la implementación actual convive con esas definiciones duplicadas y conviene normalizarla en una futura refactorización de rutas.

### Flujo de navegación post-login

```
/login ──────────────────────────────────────────────> /
              (token guardado en localStorage)
/register ───> /login  (tras registro exitoso)
/reset-password  <─── email con link de Supabase Auth
/confirm-account <─── email de confirmación de Supabase Auth
```

---

## 4. Autenticación

### Visión general

La autenticación se gestiona con JWT emitidos por Supabase Auth a través del backend. El frontend **nunca habla directamente con Supabase**; todo pasa por la GoblinHub API.

### Almacenamiento de tokens

```typescript
localStorage.setItem("token", access_token); // JWT de acceso (~1h)
localStorage.setItem("refresh_token", refresh_token); // Para renovación
localStorage.setItem("rol", me.rol); // Para guard de rutas (vía /auth/me)
```

### auth.service.ts — API pública

```typescript
// Login → devuelve { access_token, refresh_token }
login(email: string, password: string): Promise<LoginResponse>

// Registro
register(data: RegisterUserDto): Promise<void>

// Obtener perfil del usuario autenticado
getMe(): Promise<MeResponseDto>

// Cerrar sesión (limpia token, refresh_token y rol)
logout(): void

// Solicitar email de recuperación
forgotPassword(email: string): Promise<void>

// Cambiar contraseña con token de reset de URL
resetPassword(accessToken: string, newPassword: string, confirmPassword: string): Promise<void>

// Subir/reemplazar foto de perfil
uploadFotoPerfil(file: File): Promise<{ foto_perfil_url: string }>

// Actualizar datos del perfil
updatePerfil(data: UpdatePerfilDto): Promise<{ message: string }>
```

### Detalles reales del flujo de login

Después de `login()`, la aplicación:

1. guarda `token` y `refresh_token` en `localStorage`
2. intenta obtener `rol` desde la propia respuesta de login si estuviera presente
3. si no viene `rol`, llama a `getMe()` para hidratarlo
4. finalmente navega a `/`

Esto evita depender únicamente del login para resolver el rol usado por `ProtectedRoute`.

### ProtectedRoute

```typescript
// src/components/ProtectedRoute.tsx
```

Comprueba la existencia de `token` en `localStorage` antes de renderizar la ruta. Si no existe, redirige a `/login`. Para rutas con restricción de rol (admin/empleado), también verifica el campo `rol` en localStorage.

Internamente normaliza los roles a minúsculas antes de compararlos, de modo que diferencias de casing no rompan el guard.

```tsx
// Uso en App.tsx
<Route element={<ProtectedRoute allowedRoles={["admin", "empleado"]} />}>
  <Route path="/admin" element={<Administration />} />
</Route>
```

### Renovación automática de token (lib/api.ts)

El interceptor de Axios implementa el flujo de refresh transparente:

```
Request ──> [Interceptor de request] ──> adjunta Bearer token ──> API
                                                                    |
                                                               401? |
Response <── [Interceptor de response] <───────────────────────────┘
                  |
              401 detectado
                  |
              POST /auth/refresh-token
              con { refresh_token }
                  |
          ┌────────────────────────┐
          │ éxito?                 │ fallo?
          │                       │
          ▼                       ▼
    actualiza token         limpia localStorage
    reintenta request       redirige a /login
```

      ### Comportamientos adicionales del interceptor

      - Si el backend responde `401` con un mensaje que incluye `usuario no encontrado`, el frontend invalida sesión inmediatamente sin intentar refresh.
      - Si durante el refresh no existe `rol` en `localStorage`, intenta hidratarlo con una llamada adicional a `/auth/me` usando el nuevo access token.
      - Si no hay `refresh_token`, el frontend limpia sesión y redirige directamente a `/login`.

---

## 5. Servicios y API

### lib/api.ts

Instancia de Axios preconfigurada:

```typescript
import api from "../lib/api";

// Todos los servicios usan esta instancia
const response = await api.get("/eventos");
```

- **baseURL**: `import.meta.env.VITE_API_URL` (configurable por entorno)
- **Interceptor de request**: inserta `Authorization: Bearer <token>` si existe token en localStorage.
- **Interceptor de response**: gestiona el ciclo de refresh/logout automático en errores 401.

### events.service.ts

```typescript
// Obtener todos los eventos
getEvents(): Promise<ApiEvent[]>

// Obtener detalle de evento
getEventById(id: string): Promise<ApiEvent>

// Crear evento
createEvent(payload: EventUpsertDto): Promise<ApiEvent>

// Editar evento
updateEvent(id: string, payload: EventUpsertDto): Promise<ApiEvent>

// Eliminar evento
deleteEvent(id: string): Promise<ApiEvent>

// Inscribirse a un evento
inscribirse(eventoId: string, data?: InscripcionDto): Promise<void>
```

> Nota: el servicio frontend ya expone `inscribirse(...)`, aunque el backend actual todavía no implementa ese endpoint. La interfaz del frontend ya quedó preparada para ese flujo.

### logs.service.ts

```typescript
// Listado paginado de logs
getLogs(params?: GetLogsParams): Promise<PaginatedLogs>

// Obtener detalle de un log
getLogById(id: string): Promise<LogEntity>
```

### reportes.service.ts

```typescript
// Obtener métricas agregadas del dashboard
getDashboardMetrics(months?: number): Promise<DashboardMetrics>
```

### users-admin.service.ts

```typescript
// Listado administrativo de usuarios con filtros
getAdminUsers(q?: string, rol?: string): Promise<AdminUserApi[]>

// Actualización administrativa
updateAdminUser(id: string, data: AdminUserUpdateDto): Promise<{ message: string }>

// Desactivación administrativa
deleteAdminUser(id: string): Promise<{ message: string }>
```

### Tipos principales (auth.types.ts)

```typescript
interface MeResponseDto {
  id: string;
  email: string;
  nombre: string;
  apellidos: string;
  rol: "admin" | "empleado" | "jugador";
  nivel_experiencia: "novato" | "intermedio" | "veterano";
  puntos_fidelidad?: number;
  foto_perfil_url?: string;
  bio?: string;
  telefono?: string;
  fecha_nacimiento?: string;
}

interface RegisterUserDto {
  email: string;
  password: string;
  nombre: string;
  apellidos: string;
  fecha_nacimiento: string;
  telefono?: string;
  bio?: string;
  nivel_experiencia?: "novato" | "intermedio" | "veterano";
}

interface ApiEvent {
  id: string;
  titulo: string;
  tipo_evento: "torneo" | "iniciacion" | "taller" | "sesion_rol" | "especial";
  fecha: string;
  hora_inicio: string;
  hora_fin?: string;
  lugar: string;
  cupo_maximo: number;
  descripcion?: string;
  costo?: number;
  sistema_juego?: string;
}

interface DashboardMetrics {
  summary: {
    totalUsuarios: number;
    totalProductos: number;
    usuariosActivos: number;
    eventosRealizados: number;
    eventosProximos: number;
    totalAsistencias: number;
    totalNovatos: number;
    tasaConversion: number | null;
    ocupacion: number | null;
  };
}

interface AdminUserApi {
  id: string;
  nombre: string;
  apellidos: string;
  email: string | null;
  rol: "admin" | "empleado" | "jugador";
  activo: boolean;
  created_at: string;
  eventos_asistidos: number;
}
```

---

## 6. Componentes y Páginas

### Navbar (`layouts/navbar/navbar.tsx`)

La barra de navegación es **contextual**:

- **No autenticado**: muestra links públicos + botón "Iniciar sesión".
- **Autenticado**: muestra avatar del usuario, nombre, puntos de fidelidad y un dropdown con "Mi perfil" y "Cerrar sesión".

Llama a `getMe()` al montar para obtener los datos del usuario actual.

### Home — Landing Page (`pages/Home.tsx`)

Secciones de la landing:

1. **Hero**: banner principal con CTA de registro.
2. **Próximo evento**: tarjeta del siguiente evento programado.
3. **Features**: tarjetas visuales por categoría.
4. **Últimos campeones**: bloque visual estático con ganadores destacados.
5. **Mapa**: integración con `@react-google-maps/api` mostrando la ubicación de **La Guarida del Goblin**.

Además:

- Si falta `VITE_GOOGLE_MAPS_API_KEY`, la sección muestra un fallback de “Mapa no disponible”.
- El próximo evento se carga desde `/events` y se selecciona en cliente el siguiente evento futuro.

### Register — Flujo Multi-Fase (`pages/register/`)

El registro está dividido en 3 pasos para mejorar la UX:

```
Fase 1: Datos personales
  nombre, apellidos, fecha_nacimiento, teléfono, email, password, confirmar_password

Fase 2: Intereses y experiencia
  nivel_experiencia, juegos favoritos, disponibilidad horaria

Fase 3: Resumen y confirmación
  Muestra resumen → POST /auth/signup → redirige a /login
```

El estado entre fases se mantiene en un componente padre con `useState`.

### Observación sobre el payload real del registro

Aunque la UI recoge más información en las fases 2 y 3, el payload enviado hoy a `/auth/signup` se limita a:

- datos personales
- teléfono
- fecha de nacimiento
- `nivel_experiencia`

Los intereses y disponibilidades todavía no se persisten en el backend desde este flujo.

### Login (`pages/login/`)

- Formulario de email + password con validación client-side.
- Link a "¿Olvidaste tu contraseña?" que muestra un formulario de forgot-password inline (sin navegar a otra ruta).

### ResetPassword (`pages/resetPassword/`)

Supabase Auth redirige al usuario a `/reset-password#access_token=<token>`. El componente:

1. Extrae el `access_token` del hash de la URL con `window.location.hash`.
2. Muestra el formulario de nueva contraseña.
3. Llama a `resetPassword(accessToken, newPassword, confirmPassword)`.
4. Redirige a `/login` tras el éxito.

### ConfirmAccount (`pages/confirmAccount/`)

Pantalla de feedback cuando Supabase redirige al usuario tras confirmar su email. Muestra un mensaje de éxito y un botón para ir a login.

En `development`, el componente permite visualizar el diseño aun sin hash válido, usando `import.meta.env.DEV` como bypass local.

### Products (`pages/products/`)

- **Grid** de productos con filtro por categoría (tabs horizontales).
- **Badges**: "Popular" y "Nuevo" en las tarjetas.
- **Precio tachado**: muestra `precio_original` si existe junto al `precio`.
- Enlace al detalle individual de cada producto.

### Events (`pages/Events/`)

- **Listado** de eventos obtenidos desde `/events`.
- **Tarjetas** con información básica: título, fecha, lugar, cupo disponible.
- **Botón de inscripción** que redirige a login si no hay sesión y, si la hay, navega al detalle del evento.

### EventoDetalle (`pages/Events/EventoDetalle/`)

La ruta de detalle existe y recibe el `id` desde la URL, pero actualmente su implementación es mínima: muestra un encabezado simple con el identificador del evento y un link de regreso. Es un placeholder funcional pendiente de enriquecerse.

### AboutUs (`pages/aboutUs/`)

- **Información de contacto**: dirección, teléfono, email, horario de **La Guarida del Goblin**.
- **Mapa** de ubicación con Google Maps.
- **Equipo**: presentación del equipo CodeCasters con fotos y roles.

### PerfilPage (`pages/perfil/`)

- Muestra datos del usuario (nombre, email, rol, puntos, nivel).
- **Foto de perfil**: preview con opción de subir nueva imagen.
- **Formulario de edición**: actualizar nombre, apellidos, bio, teléfono, nivel.
- **Secciones visuales** para intereses, logros, actividad y configuración, algunas todavía como estructura UI más que como integración completa.

Además, la página está dividida visualmente en secciones (`personal`, `interests`, `achievements`, `activity`, `settings`), aunque varias de ellas todavía actúan más como estructura visual que como integración completa con backend.

### Administration (`pages/perfil/administracion/Administracion.tsx`)

Panel exclusivo para admin/empleado:

- **Dashboard principal** con KPIs, gráficas y acceso a módulos.
- **Consumo de logs recientes** mediante `useLogs({ limit: 5 })`.
- **Consumo de métricas** mediante `getDashboardMetrics(6)`.
- **Tarjetas navegables** hacia usuarios, eventos, reportes, logs y novatos.

### EventosAdmin (`pages/perfil/administracion/eventos/`)

- Lista eventos existentes consumiendo `getEvents()`.
- Permite crear y editar mediante modal reutilizando `EventoNuevo`.
- Permite eliminar eventos mediante `deleteEvent()`.
- Navega al detalle administrativo con `/verEvento/:id`.

### UsuariosAdmin (`pages/perfil/administracion/usuarios/`)

- Lista usuarios administrativos desde `/auth/admin/users`.
- Tiene edición, desactivación y reactivación lógica de usuarios.
- Incorpora estadísticas locales de usuarios activos, baneados y nuevos.
- Implementa búsqueda con **debounce** usando `useDebounce(searchTerm, 500)`.
- Permite filtrar por rol antes de llamar al backend.

### Reportes (`pages/perfil/administracion/reportes/`)

- Muestra un dashboard analítico con `chart.js` y `react-chartjs-2`.
- Consume métricas agregadas desde `/logs/dashboard/metrics`.
- Combina filtros de fecha y tipo de log con `useLogs()`.
- Renderiza gráficas de crecimiento, distribución por nivel, eventos por tipo y asistencia.

### LogsAdmin (`pages/admin/logs/`)

- Vista simplificada para administración de logs.
- Filtra por tipo (`success`, `info`, `warning`, `error`).
- Consume `useLogs()` y renderiza una tabla básica con fecha, acción y mensaje.

### CapacitacionNovatos (`pages/perfil/administracion/novatos/`)

La ruta y el módulo ya existen, pero su implementación actual sigue siendo mínima y actúa como placeholder.

---

## 7. Gestión de Estado

La aplicación **no usa Redux ni Context API global** deliberadamente. El estado se gestiona con:

| Solución              | Dónde                            | Cuándo                              |
| --------------------- | -------------------------------- | ----------------------------------- |
| `useState` local      | Dentro de cada componente/página | Formularios, modales, toggles       |
| `localStorage`        | `auth.service.ts` / `api.ts`     | Tokens de sesión, rol               |
| Custom hooks          | `useLogs`, `useDebounce`         | Fetch reutilizable y debounce       |
| Props / lifting state | Componentes padre → hijo         | Datos compartidos entre 2-3 niveles |
| URL state             | React Router params/hash         | IDs de recursos, tokens de reset    |

### Hooks reutilizables actuales

- `useLogs(params)` encapsula `loading`, `error` y `data` para la consulta paginada de logs.
- `useDebounce(value, delay)` estabiliza entradas reactivas; hoy se usa en la administración de usuarios para retrasar búsquedas por `500 ms`.

**Por qué no hay estado global?** La app es relativamente simple y el over-engineering de una store global (Redux, Zustand) añadiría complejidad sin beneficio real. Si la app crece, el siguiente paso natural sería añadir React Query para sincronización servidor-cliente.

---

## 8. Seguridad

| Medida                            | Implementación                                       | Por qué                                                                                  |
| --------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Rutas protegidas**              | `ProtectedRoute` comprueba token antes de renderizar | Evita que usuarios no autenticados vean contenido privado                                |
| **Tokens en localStorage**        | `token` y `refresh_token`                            | Persisten entre recargas; alternativa es httpOnly cookie (requiere backend cookie-based) |
| **Auto-logout**                   | Interceptor limpia localStorage si el refresh falla  | El usuario no queda en un estado de "token inválido" indefinidamente                     |
| **Validación client-side**        | Validación de formularios antes del POST             | Reduce requests inválidos y mejora UX (feedback inmediato)                               |
| **Sin exposición de SERVICE_KEY** | Frontend solo usa endpoints del backend propio       | La `service_role_key` de Supabase nunca llega al navegador                               |
| **HTTPS en producción**           | Configurado en el servidor (Nginx/Vercel/etc.)       | Protege tokens en tránsito                                                               |
| **No concatenación de URLs**      | Uso de `api.get('/endpoint')` con Axios              | Axios escapa parámetros correctamente                                                    |

### Nota sobre localStorage vs httpOnly Cookies

El token se guarda en `localStorage`, lo que lo hace accesible a JavaScript. La alternativa más segura son **httpOnly cookies** (inaccesibles a JS, protegen contra XSS). La implementación actual es la más habitual en SPAs y es aceptable si se toman las siguientes precauciones (ya implementadas):

- No insertar HTML no saneado en el DOM.
- No evaluar (`eval`) datos del servidor.
- CORS configurado correctamente en el backend.

### Observación técnica de seguridad actual

La estrategia de protección de rutas está bien definida a nivel de `ProtectedRoute`, pero el archivo `App.tsx` todavía mantiene algunas rutas administrativas duplicadas fuera del bloque protegido. Documentarlo es importante porque la intención del sistema es RBAC, pero la tabla de rutas debe leerse junto con esa limitación de implementación actual.

---

## 9. Testing

### Tests unitarios con Vitest

```bash
# Ejecutar una vez
npm run test

# Modo watch (desarrollo)
npm run test:watch
```

Los tests unitarios comprueban componentes con `@testing-library/react`:

```typescript
// Ejemplo: button.test.tsx
import { render, screen } from '@testing-library/react'
import { Button } from './button'

test('renders button with text', () => {
  render(<Button>Click me</Button>)
  expect(screen.getByText('Click me')).toBeInTheDocument()
})
```

**Configuración** (`test/setup.ts`):

- Extiende `expect` con matchers de `@testing-library/jest-dom` (`.toBeInTheDocument()`, etc.)
- Usa `jsdom` como entorno de DOM virtual

Actualmente existen tests unitarios para:

- `ProtectedRoute`
- botón reutilizable
- login
- register flow
- reset password
- confirm account
- about us
- listado y detalle de productos
- listado y detalle de eventos
- perfil de usuario

### Tests E2E con Playwright

```bash
# Ejecutar E2E (requiere que la app esté levantada)
npm run test:e2e

# Con interfaz gráfica
npm run test:e2e:ui

# Ver último reporte
npm run test:e2e:report
```

Los specs cubiertos:

| Spec                     | Qué prueba                                 |
| ------------------------ | ------------------------------------------ |
| `e2e/home.spec.ts`       | Landing page carga correctamente           |
| `e2e/contacto.spec.ts`   | Página de contacto/about us                |
| `e2e/example.spec.ts`    | Test de ejemplo/smoke test                 |
| `e2e/rbac-admin.spec.ts` | Redirección y control de acceso a `/admin` |

La configuración de Playwright (`playwright.config.ts`) levanta automáticamente el servidor de Vite antes de correr los tests.

Además:

- usa `baseURL: http://localhost:5173`
- genera reporte HTML
- reutiliza servidor existente fuera de CI

---

## 10. Variables de Entorno

Crea un archivo `.env` en la raíz de `goblinhub_web/`:

```env
# URL del backend
VITE_API_URL="http://localhost:3000"

# Google Maps API Key (para el mapa en Home y AboutUs)
VITE_GOOGLE_MAPS_API_KEY="AIzaSy..."
```

> Las variables de Vite **deben empezar por `VITE_`** para ser accesibles en el cliente con `import.meta.env.VITE_VARIABLE`. Variables sin ese prefijo son solo del proceso de build y no se incluyen en el bundle.

---

## 11. Scripts útiles

```bash
# Servidor de desarrollo con HMR
npm run dev

# Build de producción
npm run build

# Preview del build
npm run preview

# Lint del código
npm run lint

# Tests unitarios
npm run test

# Tests en modo watch
npm run test:watch

# Tests E2E
npm run test:e2e

# Tests E2E con UI
npm run test:e2e:ui

# Ver reporte HTML de Playwright
npm run test:e2e:report

# Pipeline completo (lint + type-check + tests + build)
npm run web
```
