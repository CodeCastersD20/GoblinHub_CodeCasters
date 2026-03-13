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
- Catálogo de productos con filtros por categoría.
- Calendario de eventos con inscripción online.
- Sistema de autenticación completo (registro, login, recuperación de contraseña, confirmación de cuenta).
- Perfil de usuario con edición de datos y foto.
- Panel de administración para gestión de eventos (roles admin/empleado).

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
│   └── events.service.ts     # Llamadas a /events/*
│
├── test/
│   └── setup.ts              # Configuración de Vitest + Testing Library
│
└── types/
    └── auth.types.ts         # Interfaces TypeScript de auth y usuario
```

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

### Rutas protegidas (requieren JWT)

Están envueltas en `<ProtectedRoute>`, que verifica el token antes de renderizar:

| Ruta             | Componente     | Roles                         |
| ---------------- | -------------- | ----------------------------- |
| `/perfil`        | PerfilPage     | Cualquier usuario autenticado |
| `/admin`         | Administration | admin, empleado               |
| `/eventosAdmin`  | EventsAdmin    | admin, empleado               |
| `/verEvento/:id` | VerEvento      | admin, empleado               |
| `/usuariosAdmin` | UsuariosAdmin  | admin, empleado               |

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
updatePerfil(data: UpdatePerfilDto): Promise<MeResponseDto>
```

### ProtectedRoute

```typescript
// src/components/ProtectedRoute.tsx
```

Comprueba la existencia de `token` en `localStorage` antes de renderizar la ruta. Si no existe, redirige a `/login`. Para rutas con restricción de rol (admin/empleado), también verifica el campo `rol` en localStorage.

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

// Inscribirse a un evento
inscribirse(eventoId: string, data?: InscripcionDto): Promise<void>
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
3. **Catálogo destacado**: productos con badge "Popular" o "Nuevo".
4. **Mapa**: integración con `@react-google-maps/api` mostrando la ubicación de **La Guarida del Goblin**.
5. **Top jugadores**: ranking de usuarios por puntos de fidelidad.
6. **Features**: tarjetas con propuesta de valor de GoblinHub.

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

### Products (`pages/products/`)

- **Grid** de productos con filtro por categoría (tabs horizontales).
- **Badges**: "Popular" y "Nuevo" en las tarjetas.
- **Precio tachado**: muestra `precio_original` si existe junto al `precio`.
- Enlace al detalle individual de cada producto.

### Events (`pages/Events/`)

- **Listado** de eventos con filtros por tipo y estado.
- **Tarjetas** con información básica: título, fecha, lugar, cupo disponible.
- **Botón de inscripción** (requiere estar autenticado).

### AboutUs (`pages/aboutUs/`)

- **Información de contacto**: dirección, teléfono, email, horario de **La Guarida del Goblin**.
- **Mapa** de ubicación con Google Maps.
- **Equipo**: presentación del equipo CodeCasters con fotos y roles.

### PerfilPage (`pages/perfil/`)

- Muestra datos del usuario (nombre, email, rol, puntos, nivel).
- **Foto de perfil**: preview con opción de subir nueva imagen.
- **Formulario de edición**: actualizar nombre, apellidos, bio, teléfono, nivel.
- **Historial de inscripciones** a eventos.

### Administration (`pages/perfil/administration/`)

Panel exclusivo para admin/empleado:

- **Gestión de eventos**: crear, editar, cancelar eventos.
- **Formulario de creación** con todos los campos del DTO.
- **Lista de eventos** con acciones por fila.

---

## 7. Gestión de Estado

La aplicación **no usa Redux ni Context API global** deliberadamente. El estado se gestiona con:

| Solución              | Dónde                            | Cuándo                              |
| --------------------- | -------------------------------- | ----------------------------------- |
| `useState` local      | Dentro de cada componente/página | Formularios, modales, toggles       |
| `localStorage`        | `auth.service.ts` / `api.ts`     | Tokens de sesión, rol               |
| Props / lifting state | Componentes padre → hijo         | Datos compartidos entre 2-3 niveles |
| URL state             | React Router params/hash         | IDs de recursos, tokens de reset    |

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

| Spec                   | Qué prueba                       |
| ---------------------- | -------------------------------- |
| `e2e/home.spec.ts`     | Landing page carga correctamente |
| `e2e/contacto.spec.ts` | Página de contacto/about us      |
| `e2e/example.spec.ts`  | Test de ejemplo/smoke test       |

La configuración de Playwright (`playwright.config.ts`) levanta automáticamente el servidor de Vite antes de correr los tests.

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

# Pipeline completo (lint + type-check + tests + build)
npm run web
```
