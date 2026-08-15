# GoblinHub API — Documentación Técnica

> **Versión**: 0.0.1 &nbsp;|&nbsp; **Framework**: NestJS + TypeScript &nbsp;|&nbsp; **ORM**: Prisma &nbsp;|&nbsp; **BD**: PostgreSQL &nbsp;|&nbsp; **Auth**: Supabase Auth

---

## Tabla de Contenidos

1. [Visión General](#1-visión-general)
2. [Arquitectura](#2-arquitectura)
3. [Configuración y Variables de Entorno](#3-configuración-y-variables-de-entorno)
4. [Base de Datos — Esquema](#4-base-de-datos--esquema)
5. [Autenticación y Seguridad](#5-autenticación-y-seguridad)
6. [Módulos y Endpoints](#6-módulos-y-endpoints)
   - [Auth](#61-módulo-auth)
   - [Events](#62-módulo-events)
   - [Products](#63-módulo-products)
   - [Rewards](#64-módulo-rewards)
   - [Upload](#65-módulo-upload)
   - [Backup](#66-módulo-backup)
   - [Logs](#67-módulo-logs)
7. [Patrones de Diseño](#7-patrones-de-diseño)
8. [Testing](#8-testing)
9. [Scripts útiles](#9-scripts-útiles)

---

## 1. Visión General

GoblinHub API es el backend de la plataforma de **La Guarida del Goblin**, una tienda y comunidad de juegos de mesa, wargames y rol. Administra:

- **Autenticación** delegada a Supabase Auth con validación de sesión y sincronización contra la base de datos propia.
- **Perfiles de usuario** con datos extendidos, foto de perfil y control de roles.
- **Catálogo de productos** con gestión de stock, categorías y soft-delete.
- **Eventos** (torneos, talleres, sesiones de rol) con scheduler automático para transición de estados.
- **Recompensas** asociadas a puntos de fidelidad.
- **Subida de imágenes** a Supabase Storage con compresión WebP automática.
- **Backups** de base de datos bajo demanda con restauración transaccional.
- **Auditoría y métricas** mediante un módulo de logs y un interceptor global de actividad.

La API está construida sobre **NestJS** y sigue un diseño modular con separación entre controladores HTTP, casos de uso, persistencia y dominio. Prisma se conecta a PostgreSQL mediante `@prisma/adapter-pg`, mientras que Supabase cubre autenticación y almacenamiento de archivos.

---

## 2. Arquitectura

```text
src/
├── main.ts                   # Bootstrap (Helmet, CORS, Swagger, Validation, redirects)
├── app.module.ts             # Módulo raíz
├── connect/
│   ├── prisma.module.ts      # Módulo global de Prisma
│   └── prisma.service.ts     # Wrapper de PrismaClient usando PrismaPg
└── modules/
    ├── supabase/             # Auth, perfiles, guardias, integración Supabase
    ├── events/               # Gestión de eventos y scheduler de expiración
    ├── products/             # Catálogo de productos
    ├── rewards/              # Sistema de recompensas
    ├── upload/               # Subida/eliminación de imágenes
    ├── backup/               # Backup y restauración de BD
    └── logs/                 # Auditoría, dashboard y consulta de actividad
```

### Patrón por módulo (Clean Architecture adaptada)

Cada módulo intenta separar responsabilidades en capas. En el repositorio real hay pequeñas variaciones de nomenclatura, pero el patrón dominante es este:

```text
modules/<nombre>/
├── application/ | aplication/
│   └── use-case/             # Lógica de negocio (un archivo por caso de uso)
├── infrastructure/           # Repositorios, scheduler, interceptors, integración externa
├── interfaces/               # HTTP controllers y capa de entrada
├── domain/                   # Entidades, enums, contratos y DTOs según módulo
└── <nombre>.module.ts        # Ensamble del módulo (providers, imports, controllers)
```

> **Por qué este patrón?** Permite que la lógica de negocio viva fuera de Nest controllers y fuera de Prisma directamente, reduciendo acoplamiento y facilitando tests unitarios de los use-cases de forma aislada.

### Qué carga realmente `AppModule`

El `AppModule` importa y activa:

- `ThrottlerModule` con rate limiting global
- `ConfigModule` como global
- `ScheduleModule` para tareas programadas
- `EventModule`
- `LogsModule`
- `SupabaseAuthModule`
- `BackupModule`
- `RewardModule`
- `ProductoModule`
- `UploadModule`
- `PrismaModule`

Además registra globalmente:

- `ThrottlerGuard` como `APP_GUARD`
- `ActivityLogInterceptor` como `APP_INTERCEPTOR`

### Bootstrap real en `main.ts`

Durante el arranque, la aplicación:

- configura `helmet` con CSP diferenciada entre desarrollo y producción
- habilita CORS usando `CORS_ORIGIN`
- aplica `ValidationPipe` global con `whitelist`, `forbidNonWhitelisted` y `transform`
- genera Swagger solo fuera de producción en `/api/docs`
- redirige accesos directos de navegador al frontend cuando la petición no parece una llamada API
- escucha en `PORT` o, por defecto, en `3000`

---

## 3. Configuración y Variables de Entorno

Crea un archivo `.env` en la raíz de `goblinhub-api/`:

```env
# Base de datos PostgreSQL (Supabase o local)
DATABASE_URL="postgresql://user:password@host:5432/goblinhub?schema=public"

# Supabase proyecto
SUPABASE_URL="https://<tu-proyecto>.supabase.co"
SUPABASE_ANON_KEY="<anon-key>"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"   # Solo backend, nunca exponer en frontend

# Storage / recuperación de contraseña
SUPABASE_STORAGE_BUCKET="images"
SUPABASE_RESET_PASSWORD_URL="http://localhost:5173/reset-password"

# CORS — origenes permitidos separados por coma
CORS_ORIGIN="http://localhost:5173,https://tu-dominio.com"

# Entorno
NODE_ENV="development"

# Puerto HTTP
PORT="3000"
```

> **Seguridad**: `.env` está en `.gitignore`. Nunca versionar credenciales. La `SERVICE_ROLE_KEY` tiene privilegios de administrador en Supabase y solo debe usarse en el backend.

### Qué usa realmente cada variable

| Variable                      | Uso real en código                                                    |
| ----------------------------- | --------------------------------------------------------------------- |
| `DATABASE_URL`                | Conexión de Prisma mediante `PrismaPg`                                |
| `SUPABASE_URL`                | Cliente Supabase y construcción de URLs públicas de Storage           |
| `SUPABASE_ANON_KEY`           | Cliente Supabase estándar para auth y validación                      |
| `SUPABASE_SERVICE_ROLE_KEY`   | Cliente admin para Storage y operaciones privilegiadas                |
| `SUPABASE_STORAGE_BUCKET`     | Bucket de imágenes. Si no está definido, se usa `images`              |
| `SUPABASE_RESET_PASSWORD_URL` | Redirect usado en el flujo de forgot password                         |
| `CORS_ORIGIN`                 | Lista de orígenes permitidos                                          |
| `NODE_ENV`                    | Activa/desactiva Swagger y bloquea endpoints de testing en producción |
| `PORT`                        | Puerto de escucha de Nest                                             |

### Nota sobre JWT

Aunque conceptualmente Supabase emite JWT, **el backend actual no valida el token localmente con `JWT_SECRET`**. La validación real se hace consultando `supabase.auth.getUser(token)`. Por eso `JWT_SECRET` no es una dependencia activa del código tal como está hoy.

---

## 4. Base de Datos — Esquema

### Diagrama conceptual

```text
usuarios ──< inscripciones >── eventos
usuarios ──< canjes >── recompensas
usuarios ──< captacion_novatos
usuarios ──< disponibilidades
usuarios ──< logs_actividad
usuarios ──< usuario_intereses >── intereses
productos (independiente)
recompensas (independiente)
```

### Tablas

#### `usuarios`

| Campo                | Tipo      | Descripción                                    |
| -------------------- | --------- | ---------------------------------------------- |
| `id_usuario`         | UUID (PK) | Mismo UUID que Supabase Auth → clave de enlace |
| `nombre`             | String    | Nombre                                         |
| `apellidos`          | String    | Apellidos                                      |
| `telefono`           | String?   | Teléfono de contacto                           |
| `fecha_nacimiento`   | Date      | Fecha de nacimiento                            |
| `rol`                | Enum      | `admin`, `empleado`, `jugador`                 |
| `nivel_experiencia`  | Enum      | `novato`, `intermedio`, `veterano`             |
| `puntos_fidelidad`   | Int       | Puntos acumulados                              |
| `bio`                | String?   | Descripción personal                           |
| `foto_perfil_url`    | String?   | URL pública en Supabase Storage                |
| `activo`             | Boolean   | Bandera lógica de activación                   |
| `id_usuario_creador` | UUID?     | Usuario creador si aplica                      |
| `created_at`         | DateTime  | Timestamp de creación                          |
| `updated_at`         | DateTime  | Timestamp de última modificación               |
| `deleted_at`         | DateTime? | Soft delete por timestamp                      |

#### `eventos`

| Campo                  | Tipo      | Descripción                                                |
| ---------------------- | --------- | ---------------------------------------------------------- |
| `id_evento`            | UUID (PK) | Identificador único                                        |
| `titulo`               | String    | Nombre del evento                                          |
| `descripcion`          | String?   | Texto descriptivo                                          |
| `tipo_evento`          | Enum      | `torneo`, `iniciacion`, `taller`, `sesion_rol`, `especial` |
| `fecha`                | Date      | Fecha del evento                                           |
| `hora_inicio`          | Time      | Hora de inicio                                             |
| `hora_fin`             | Time?     | Hora de finalización                                       |
| `lugar`                | String    | Ubicación                                                  |
| `costo`                | Decimal   | Precio del evento                                          |
| `cupo_maximo`          | Int       | Límite de participantes                                    |
| `estado`               | Enum      | `programado`, `en_curso`, `finalizado`, `cancelado`        |
| `sistema_juego`        | String?   | Sistema de juego utilizado                                 |
| `puntos_premio_1/2/3`  | Int       | Puntos para podio                                          |
| `puntos_participacion` | Int       | Puntos por asistencia                                      |
| `id_creador`           | UUID      | FK a `usuarios.id_usuario`                                 |
| `created_at`           | DateTime  | Creación                                                   |
| `updated_at`           | DateTime  | Modificación                                               |
| `deleted_at`           | DateTime? | Soft delete                                                |

#### `inscripciones`

| Campo              | Tipo      | Descripción         |
| ------------------ | --------- | ------------------- |
| `id_inscripcion`   | UUID (PK) | Identificador único |
| `id_evento`        | UUID      | FK a `eventos`      |
| `id_usuario`       | UUID      | FK a `usuarios`     |
| `faccion`          | String?   | Facción asociada    |
| `nombre_ejercito`  | String?   | Ejército o lista    |
| `asistio`          | Boolean   | Marca de asistencia |
| `posicion_final`   | Int?      | Puesto alcanzado    |
| `es_ganador`       | Boolean   | Marca al ganador    |
| `puntos_obtenidos` | Int       | Puntos calculados   |
| `created_at`       | DateTime  | Inscripción         |
| `updated_at`       | DateTime  | Modificación        |
| `deleted_at`       | DateTime? | Soft delete         |

#### `productos`

| Campo             | Tipo      | Descripción                                        |
| ----------------- | --------- | -------------------------------------------------- |
| `id_producto`     | UUID (PK) | Identificador único                                |
| `nombre`          | String    | Nombre del producto                                |
| `marca`           | String?   | Fabricante/editorial                               |
| `categoria`       | Enum      | `WARGAMES`, `ROL`, `MESA`, `PINTURA`, `ACCESORIOS` |
| `descripcion`     | String?   | Descripción                                        |
| `precio`          | Decimal   | Precio actual                                      |
| `precio_original` | Decimal?  | Precio tachado                                     |
| `stock`           | Int       | Unidades disponibles                               |
| `stock_minimo`    | Int       | Umbral de alerta                                   |
| `popular`         | Boolean   | Badge “Popular”                                    |
| `es_nuevo`        | Boolean   | Badge “Nuevo”                                      |
| `imagen_url`      | String?   | URL en Supabase Storage                            |
| `activo`          | Boolean   | Estado lógico                                      |
| `id_creador`      | UUID?     | FK lógica a usuario creador                        |
| `created_at`      | DateTime  | Creación                                           |
| `updated_at`      | DateTime  | Modificación                                       |
| `deleted_at`      | DateTime? | Soft delete                                        |

#### `recompensas`

| Campo             | Tipo                    | Descripción                                             |
| ----------------- | ----------------------- | ------------------------------------------------------- |
| `id_recompensa`   | Int (PK, autoincrement) | Identificador                                           |
| `nombre`          | String                  | Nombre de la recompensa                                 |
| `descripcion`     | String?                 | Descripción                                             |
| `costo_puntos`    | Int                     | Puntos necesarios                                       |
| `tipo`            | Enum                    | `descuento`, `producto_gratis`, `acceso_evento`, `otro` |
| `valor_descuento` | Decimal?                | Descuento aplicado si corresponde                       |
| `activa`          | Boolean                 | Estado lógico                                           |
| `id_creador`      | UUID?                   | Usuario creador                                         |
| `created_at`      | DateTime                | Creación                                                |
| `updated_at`      | DateTime                | Modificación                                            |
| `deleted_at`      | DateTime?               | Soft delete                                             |

#### `logs_actividad`

| Campo         | Tipo        | Descripción                           |
| ------------- | ----------- | ------------------------------------- |
| `id_log`      | BigInt (PK) | Identificador del log                 |
| `tipo`        | Enum        | `success`, `info`, `warning`, `error` |
| `accion`      | String      | Acción ejecutada                      |
| `mensaje`     | String      | Mensaje humano del evento             |
| `id_usuario`  | UUID?       | Usuario asociado si existe            |
| `ip_address`  | String?     | IP origen                             |
| `datos_extra` | JSON?       | Metadatos del evento                  |
| `fecha_hora`  | DateTime    | Momento del log                       |
| `updated_at`  | DateTime    | Actualización                         |
| `deleted_at`  | DateTime?   | Soft delete                           |

### Importante sobre el alcance real

El esquema Prisma modela más cosas que la API expone actualmente. Por ejemplo:

- existen `inscripciones`, pero no hay todavía endpoints públicos para inscribirse a eventos
- existen `canjes`, pero no hay endpoint de redención de recompensas
- existen `captacion_novatos`, `disponibilidades` e `intereses`, pero no están expuestos como módulo HTTP propio

Esto significa que la base de datos ya contempla crecimiento funcional futuro, aunque la superficie HTTP actual todavía no cubre todo ese dominio.

---

## 5. Autenticación y Seguridad

### Cómo funciona la autenticación

GoblinHub utiliza **Supabase Auth** como proveedor de identidad y el backend actúa como **Resource Server** validando sesiones contra Supabase y cruzando el usuario autenticado con la base de datos interna.

```text
[Frontend]          [Backend]                     [Supabase Auth]
    |                   |                               |
    |── POST /signin ──>|── signInWithPassword() ──────>|
    |                   |<── access/refresh tokens ─────|
    |<── tokens ────────|                               |
    |                   |                               |
    |── GET /auth/me ──>|                               |
    | Bearer <token>    |── getUser(token) ────────────>|
    |                   |<── user session validada ─────|
    |                   |── busca perfil en PostgreSQL  |
    |<── perfil ────────|                               |
```

### SupabaseAuthGuard

```typescript
// modules/supabase/guard/supabse-auth.guard.ts
```

El guard:

1. Extrae el token del header `Authorization: Bearer <token>`.
2. Valida el token usando `supabase.auth.getUser(token)`.
3. Busca al usuario en la tabla `usuarios`.
4. Rechaza acceso si el usuario no existe, está inactivo o tiene `deleted_at`.
5. Inyecta `request.user` para uso posterior en controladores y guards.

### RolesGuard + `@Roles()` Decorator

El control de acceso por rol funciona en dos pasos:

1. `SupabaseAuthGuard` autentica al usuario y obtiene su `id_usuario`.
2. `RolesGuard` consulta en la tabla `usuarios` el campo `rol` y lo compara con los roles requeridos por el endpoint.

```typescript
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('admin')
@Delete(':id')
async deleteEvento(@Param('id') id: string) { ... }
```

### Medidas de Seguridad Implementadas

| Medida                    | Implementación                                                                    | Por qué                                                    |
| ------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Helmet**                | `app.use(helmet(...))` en `main.ts`                                               | Configura CSP, HSTS, frameguard, referrer-policy y noSniff |
| **CORS Whitelist**        | `origin: process.env.CORS_ORIGIN?.split(',')`                                     | Solo permite requests desde dominios autorizados           |
| **Rate Limiting Global**  | `ThrottlerModule` — `10 req / 60s`                                                | Reduce abuso general y fuerza bruta básica                 |
| **Auth Rate Limiting**    | `5 req / 90s` en `/auth/signin`, `/signup`, `/forgot-password`, `/reset-password` | Protección específica de endpoints sensibles               |
| **DTO Validation**        | `class-validator` + `whitelist: true` + `forbidNonWhitelisted: true`              | Rechaza campos no declarados en DTO                        |
| **SQL Injection**         | Prisma ORM + queries parametrizadas                                               | Evita SQL crudo concatenado en operaciones principales     |
| **Path Traversal**        | Validación estricta del `filename` en restore backup                              | Evita acceder archivos fuera de `./backups`                |
| **File Upload**           | Validación MIME + límite 5MB + bucket controlado                                  | Previene archivos arbitrarios o demasiado grandes          |
| **Soft Delete**           | `deleted_at`, `activo` y `activa` según entidad                                   | Permite auditoría y recuperación lógica                    |
| **Prisma driver adapter** | `@prisma/adapter-pg`                                                              | Conexión explícita a PostgreSQL sobre `pg`                 |
| **Activity Logging**      | `ActivityLogInterceptor` global                                                   | Registra operaciones mutantes exitosas y fallidas          |

### ActivityLogInterceptor

El backend registra automáticamente actividad en la tabla `logs_actividad`.

Comportamiento real:

- registra `POST`, `PUT`, `PATCH` y `DELETE`
- no registra `GET`
- excluye rutas que empiezan por `/logs` para evitar recursividad y ruido
- captura `statusCode`, `user-agent`, IP y usuario autenticado cuando existe
- registra tanto éxito como error

### Flujo de Renovación de Token

El frontend gestiona la expiración del `access_token` automáticamente:

1. Request con token expirado → Backend devuelve `401 Unauthorized`.
2. Interceptor de Axios hace `POST /auth/refresh-token` con el `refresh_token`.
3. Si el refresh es válido: se actualiza el `access_token` y se reintenta el request original.
4. Si el refresh falla: el frontend limpia sesión y redirige a `/login`.

---

## 6. Módulos y Endpoints

### 6.1 Módulo Auth

**Base URL**: `/auth`

| Método   | Endpoint                | Auth | Roles                 | Descripción                                           |
| -------- | ----------------------- | ---- | --------------------- | ----------------------------------------------------- |
| `POST`   | `/auth/signin`          | —    | —                     | Login con email y password                            |
| `POST`   | `/auth/signup`          | —    | —                     | Registro de nuevo usuario                             |
| `POST`   | `/auth/refresh-token`   | —    | —                     | Renovar `access_token` con `refresh_token`            |
| `GET`    | `/auth/profile`         | JWT  | cualquier autenticado | Obtener perfil directo desde Supabase                 |
| `GET`    | `/auth/me`              | JWT  | cualquier autenticado | Obtener perfil del usuario autenticado desde la BD    |
| `GET`    | `/auth/verify`          | JWT  | cualquier autenticado | Verificar si el token sigue siendo válido             |
| `POST`   | `/auth/forgot-password` | —    | —                     | Solicitar email de reset de contraseña                |
| `POST`   | `/auth/reset-password`  | —    | —                     | Cambiar contraseña con token de reset                 |
| `POST`   | `/auth/test/signin`     | JWT  | admin                 | Endpoint interno de testing, bloqueado en producción  |
| `PATCH`  | `/auth/me`              | JWT  | cualquier autenticado | Actualizar datos del perfil                           |
| `PUT`    | `/auth/me/foto`         | JWT  | cualquier autenticado | Subir o reemplazar foto de perfil                     |
| `DELETE` | `/auth/me/foto`         | JWT  | cualquier autenticado | Eliminar foto de perfil                               |
| `GET`    | `/auth/admin/users`     | JWT  | admin, empleado       | Listar usuarios con filtros para panel administrativo |
| `PATCH`  | `/auth/admin/users/:id` | JWT  | admin, empleado       | Actualizar usuario desde panel administrativo         |
| `DELETE` | `/auth/admin/users/:id` | JWT  | admin                 | Desactivar usuario desde admin                        |

#### POST /auth/signin

```json
// Request Body
{
  "email": "usuario@ejemplo.com",
  "password": "MiPassword123"
}

// Response 200
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc..."
}
```

> Nota: el rol no viene en `/auth/signin`; el frontend lo hidrata con `GET /auth/me` después del login.

#### POST /auth/signup

```json
// Request Body
{
  "email": "nuevo@ejemplo.com",
  "password": "MinPass1A",
  "nombre": "Juan",
  "apellidos": "García López",
  "fecha_nacimiento": "1995-05-15",
  "telefono": "612345678",
  "bio": "Me gustan los wargames",
  "nivel_experiencia": "novato"
}
```

#### PATCH /auth/me

```json
// Request Body (todos opcionales)
{
  "nombre": "Nuevo nombre",
  "apellidos": "Nuevos apellidos",
  "telefono": "699000111",
  "fecha_nacimiento": "1995-05-15",
  "bio": "Nueva bio",
  "nivel_experiencia": "intermedio"
}
```

#### POST /auth/reset-password

```json
{
  "accessToken": "eyJhbGc...",
  "newPassword": "NuevaClave123",
  "confirmPassword": "NuevaClave123"
}
```

#### GET /auth/admin/users

Soporta filtros por query:

- `q`: término de búsqueda
- `rol`: `admin`, `empleado`, `jugador` o `todos`

#### Restricción importante en edición administrativa

Cuando quien ejecuta `PATCH /auth/admin/users/:id` tiene rol `empleado`, el backend sanitiza el DTO y **no permite** cambiar:

- `rol`
- `activo`

En ese caso solo puede modificar campos de perfil básicos.

---

### 6.2 Módulo Events

**Base URL**: `/events`

| Método   | Endpoint           | Auth | Roles           | Descripción                      |
| -------- | ------------------ | ---- | --------------- | -------------------------------- |
| `GET`    | `/events`          | —    | —               | Listar todos los eventos activos |
| `GET`    | `/events?name=xxx` | —    | —               | Buscar eventos por nombre        |
| `GET`    | `/events/:id`      | —    | —               | Detalle de un evento             |
| `POST`   | `/events`          | JWT  | admin, empleado | Crear nuevo evento               |
| `PUT`    | `/events/:id`      | JWT  | admin, empleado | Editar evento                    |
| `DELETE` | `/events/:id`      | JWT  | admin           | Soft delete                      |

#### POST /events

```json
{
  "titulo": "Torneo Age of Sigmar Febrero",
  "tipo_evento": "torneo",
  "fecha": "2026-04-15",
  "hora_inicio": "10:00",
  "hora_fin": "18:00",
  "lugar": "Sala principal",
  "cupo_maximo": 16,
  "descripcion": "...",
  "costo": 5.0,
  "estado": "programado",
  "sistema_juego": "Age of Sigmar 4a Edición",
  "puntos_premio_1": 300,
  "puntos_premio_2": 150,
  "puntos_premio_3": 75,
  "puntos_participacion": 25
}
```

#### Scheduler automático de eventos

El módulo incluye un `@Cron(CronExpression.EVERY_MINUTE)` que ejecuta `ExpireEventsUseCase` cada minuto para actualizar el ciclo de vida de los eventos.

Flujo esperado por la lógica del dominio:

- `programado` → `en_curso` cuando llega la ventana del evento
- `en_curso` → `finalizado` cuando llega la `hora_fin`
- según el caso de uso, los eventos ya vencidos también pueden entrar en flujo de expiración lógica

#### Alcance actual

Aunque existen tablas de `inscripciones`, **el backend actual no expone todavía**:

- `POST /events/:id/inscripcion`
- `GET /events/:id/inscripciones`

Esas capacidades están modeladas en la base de datos, pero no implementadas en el controlador HTTP actual.

---

### 6.3 Módulo Products

**Base URL**: `/productos`

| Método   | Endpoint                          | Auth | Roles           | Descripción                        |
| -------- | --------------------------------- | ---- | --------------- | ---------------------------------- |
| `GET`    | `/productos`                      | —    | —               | Listar todos los productos activos |
| `GET`    | `/productos/:id`                  | —    | —               | Detalle de producto                |
| `GET`    | `/productos/categoria/:categoria` | —    | —               | Filtrar por categoría              |
| `POST`   | `/productos`                      | JWT  | admin, empleado | Crear producto                     |
| `PUT`    | `/productos/:id`                  | JWT  | admin, empleado | Editar producto                    |
| `DELETE` | `/productos/:id`                  | JWT  | admin           | Soft delete                        |

#### Categorías disponibles

`WARGAMES` · `ROL` · `MESA` · `PINTURA` · `ACCESORIOS`

#### POST /productos

```json
{
  "nombre": "Warhammer 40.000 Starter Set",
  "categoria": "WARGAMES",
  "precio": 49.99,
  "precio_original": 59.99,
  "marca": "Games Workshop",
  "descripcion": "...",
  "stock": 10,
  "stock_minimo": 3,
  "imagen_url": "https://...",
  "popular": true,
  "es_nuevo": false,
  "activo": true
}
```

---

### 6.4 Módulo Rewards

**Base URL**: `/rewards`

| Método   | Endpoint            | Auth | Roles           | Descripción                          |
| -------- | ------------------- | ---- | --------------- | ------------------------------------ |
| `GET`    | `/rewards`          | —    | —               | Listar todas las recompensas activas |
| `GET`    | `/rewards?name=xxx` | —    | —               | Buscar por nombre                    |
| `GET`    | `/rewards/:id`      | —    | —               | Detalle de recompensa                |
| `POST`   | `/rewards`          | JWT  | admin, empleado | Crear recompensa                     |
| `PATCH`  | `/rewards/:id`      | JWT  | admin, empleado | Editar recompensa                    |
| `DELETE` | `/rewards/:id`      | JWT  | admin           | Soft delete                          |

#### POST /rewards

```json
{
  "nombre": "Descuento 10%",
  "descripcion": "...",
  "tipo": "descuento",
  "costo_puntos": 500,
  "valor_descuento": 10,
  "activa": true
}
```

#### Alcance actual

La tabla `canjes` existe en Prisma, pero el backend actual **no expone** todavía un endpoint como:

- `POST /rewards/:id/canje`

La funcionalidad de redención está modelada a nivel de datos, pero aún no está abierta por HTTP.

---

### 6.5 Módulo Upload

**Base URL**: `/upload`

| Método   | Endpoint             | Auth | Roles           | Descripción     |
| -------- | -------------------- | ---- | --------------- | --------------- |
| `POST`   | `/upload?folder=xxx` | JWT  | admin, empleado | Subir imagen    |
| `DELETE` | `/upload?url=xxx`    | JWT  | admin, empleado | Eliminar imagen |

#### POST /upload

- **Content-Type**: `multipart/form-data`
- **Field**: `file`
- **Formatos aceptados**: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- **Tamaño máximo**: 5 MB
- **Query `folder`**: `products` | `events` | `profiles` | `misc`

El servicio procesa la imagen con **Sharp**:

- Si no es GIF: convierte a WebP con quality 80
- Si es GIF: mantiene el formato original
- Genera un UUID v4 como nombre para evitar colisiones
- Sube a Supabase Storage con visibilidad pública

```json
// Response 201
{
  "url": "https://<proyecto>.supabase.co/storage/v1/object/public/images/products/uuid.webp"
}
```

---

### 6.6 Módulo Backup

**Base URL**: `/backup`

> Requiere que `postgresql-client` (`pg_dump` y `psql`) esté instalado en el servidor.

| Método | Endpoint          | Auth | Roles | Descripción                           |
| ------ | ----------------- | ---- | ----- | ------------------------------------- |
| `GET`  | `/backup`         | JWT  | admin | Listar archivos de backup disponibles |
| `POST` | `/backup`         | JWT  | admin | Crear backup manual                   |
| `POST` | `/backup/restore` | JWT  | admin | Restaurar desde un backup             |

#### POST /backup/restore

```json
{
  "filename": "backup_2026-03-11_14-30-00.sql"
}
```

**Seguridad del backup**:

- El `filename` es validado con regex estricta: `^backup_[\d]{4}-[\d]{2}-[\d]{2}_[\d]{2}-[\d]{2}-[\d]{2}\.sql$`
- La restauración usa `--single-transaction` en `psql` para que un fallo parcial haga rollback completo.
- Los archivos de backup se almacenan en `./backups/`.
- Si `pg_dump` o `psql` no están disponibles, el servicio devuelve error controlado.

#### Respuestas del módulo

`GET /backup` devuelve:

```json
{
  "success": true,
  "count": 2,
  "backups": [
    {
      "filename": "backup_2026-03-11_14-30-00.sql",
      "createdAt": "2026-03-11T14:30:00.000Z",
      "sizeKb": 824
    }
  ]
}
```

---

### 6.7 Módulo Logs

**Base URL**: `/logs`

Este módulo existe en el backend real y complementa la auditoría operativa del sistema.

| Método | Endpoint                  | Auth | Roles | Descripción                        |
| ------ | ------------------------- | ---- | ----- | ---------------------------------- |
| `GET`  | `/logs/dashboard/metrics` | JWT  | admin | Métricas agregadas para dashboard  |
| `GET`  | `/logs/recent`            | JWT  | admin | Logs recientes con filtros rápidos |
| `GET`  | `/logs`                   | JWT  | admin | Consulta paginada de logs          |
| `GET`  | `/logs/:id`               | JWT  | admin | Detalle de un log                  |

#### Query params soportados

`GET /logs`

- `page`
- `limit`
- `tipo`
- `accion`
- `usuarioId`
- `desde`
- `hasta`
- `includeTotal`

`GET /logs/recent`

- `limit`
- `tipo`
- `accion`
- `usuarioId`
- `desde`
- `hasta`
- `includeTotal`

`GET /logs/dashboard/metrics`

- `months`

#### Qué expone el dashboard de logs

El caso de uso de métricas compone, entre otros indicadores:

- total de usuarios
- total de productos
- usuarios activos
- eventos realizados
- eventos próximos
- total de asistencias
- total de novatos
- tasa de conversión
- ocupación
- crecimiento mensual de usuarios
- crecimiento mensual de eventos
- distribución por nivel
- eventos por tipo
- top usuarios por asistencia

Esto convierte al módulo de logs en una mezcla de **auditoría operativa** y **fuente de métricas de negocio** para paneles administrativos.

---

## 7. Patrones de Diseño

### Use Case Pattern

Cada operación de negocio vive en su propio use-case:

```typescript
// Ejemplo: SignInUseCase
@Injectable()
export class SignInUseCase {
  constructor(private readonly supabaseService: SupabaseService) {}

  async execute(email: string, password: string) {
    const { data, error } =
      await this.supabaseService.client.auth.signInWithPassword({
        email,
        password,
      });
    if (error) throw new UnauthorizedException(error.message);
    return data;
  }
}
```

**Ventaja**: Cada caso de uso es testeable de forma aislada mockeando solo sus dependencias directas.

### Repository Pattern (via Prisma)

Los repositorios encapsulan el acceso a BD:

```typescript
// Ejemplo conceptual de repositorio Prisma
@Injectable()
export class EventsPrismaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.evento.findMany({ where: { deleted_at: null } });
  }
}
```

Los use-cases dependen de la abstracción del repositorio, no de Prisma directamente.

### Guard + Decorator Pattern

Nest se aprovecha aquí de un patrón muy natural para seguridad:

- `SupabaseAuthGuard` resuelve autenticación
- `RolesGuard` resuelve autorización
- `@Roles(...)` declara la política en el endpoint

Esto mantiene reglas de acceso cerca del controller, pero sin mezclar validación de permisos dentro del caso de uso.

### Interceptor Pattern

El `ActivityLogInterceptor` es un buen ejemplo de lógica transversal desacoplada:

- no pertenece a un módulo funcional concreto como products o events
- se aplica globalmente
- centraliza auditoría de operaciones mutantes

Esto evita duplicar logging manual en cada controller o use-case.

---

## 8. Testing

### Cobertura de Tests

Los tests unitarios se centran en use-cases, controladores y guards relevantes. Para correr con reporte de cobertura:

```bash
npm run test:cov
```

Los paths incluidos en cobertura son:

- `modules/events/application/use-case/**`
- `modules/products/aplication/use-case/**`
- `modules/rewards/aplication/use-case/**`
- `modules/supabase/application/use-case/**`
- `modules/supabase/infrastructure/controller/**`
- `modules/supabase/infrastructure/prisma/**`
- `modules/supabase/guard/**`

El reporte HTML se genera en `/coverage/index.html`.

### Test E2E

```bash
npm run test:e2e
```

Usa `supertest` para levantar la aplicación en memoria y hacer requests HTTP reales contra `test/app.e2e-spec.ts`.

### Script de validación completa

```bash
npm run api
```

Ese script ejecuta el pipeline:

1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm run build`
4. `npm run test:cov`

---

## 9. Scripts útiles

```bash
# Desarrollo con hot-reload
npm run start:dev

# Desarrollo con debug
npm run start:debug

# Build de producción
npm run build

# Iniciar en producción
npm run start:prod

# Aplicar migraciones de BD
npx prisma migrate dev

# Abrir Prisma Studio (GUI de BD)
npx prisma studio

# Correr todos los tests
npm run test

# Correr tests con cobertura
npm run test:cov

# Correr tests E2E
npm run test:e2e

# Lint + Type check + Build + Tests (pipeline completo)
npm run api

# Backup manual vía scripts auxiliares
bash scripts/backup.sh

# Restaurar backup vía scripts auxiliares
bash scripts/restore.sh
```

### Observación final

Esta documentación refleja el backend **realmente implementado hoy**. Algunas capacidades del dominio ya existen en Prisma, pero todavía no están expuestas como endpoints HTTP. Cuando esas piezas se implementen, conviene extender esta misma estructura en lugar de documentarlas por adelantado como si ya estuvieran operativas.
