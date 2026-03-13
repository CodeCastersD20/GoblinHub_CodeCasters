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
7. [Patrones de Diseño](#7-patrones-de-diseño)
8. [Testing](#8-testing)
9. [Scripts útiles](#9-scripts-útiles)

---

## 1. Visión General

GoblinHub API es el backend de la plataforma de **La Guarida del Goblin**, una tienda y comunidad de juegos de mesa, wargames y rol. Administra:

- **Autenticación** delegada a Supabase Auth con verificación de JWT en cada request privado.
- **Catálogo de productos** con gestión de stock, categorías y soft-delete.
- **Eventos** (torneos, talleres, sesiones de rol) con cupos, inscripciones y asignación automática de puntos de fidelidad.
- **Recompensas** canjeables con puntos de fidelidad.
- **Subida de imágenes** a Supabase Storage con compresión WebP automática.
- **Backups** de base de datos bajo demanda con restauración transaccional.

---

## 2. Arquitectura

```
src/
├── main.ts                   # Bootstrap (Helmet, CORS, Throttler, Swagger, Validation)
├── app.module.ts             # Módulo raíz
├── connect/
│   ├── prisma.module.ts      # Módulo global de Prisma
│   └── prisma.service.ts     # Wrapper de PrismaClient con onModuleInit/onModuleDestroy
└── modules/
    ├── supabase/             # Auth (guard, JWT, use-cases)
    ├── events/               # Gestión de eventos
    ├── products/             # Catálogo de productos
    ├── rewards/              # Sistema de recompensas
    ├── upload/               # Subida/eliminación de imágenes
    └── backup/               # Backup y restauración de BD
```

### Patrón por módulo (Clean Architecture)

Cada módulo sigue la misma estructura para separar responsabilidades:

```
modules/<nombre>/
├── application/
│   └── use-case/             # Lógica de negocio (un archivo por caso de uso)
├── infrastructure/
│   ├── controller/           # HTTP controllers (reciben y responden)
│   └── prisma/               # Repositorios Prisma (acceso a BD)
├── domain/
│   └── dto/                  # Data Transfer Objects (validación con class-validator)
└── <nombre>.module.ts        # Ensamble del módulo (providers, imports, controllers)
```

> **Por qué este patrón?** Permite cambiar la fuente de datos (ej: de Prisma a otro ORM) sin tocar la lógica de negocio, y facilita el testing unitario de use-cases de forma aislada.

---

## 3. Configuración y Variables de Entorno

Crea un archivo `.env` en la raíz de `goblinhub-api/`:

```env
# Base de datos PostgreSQL (Supabase o local)
DATABASE_URL="postgresql://user:password@host:5432/goblinhub?schema=public"

# Supabase proyecto
SUPABASE_URL="https://<tu-proyecto>.supabase.co"
SUPABASE_ANON_KEY="<anon-key>"
SUPABASE_SERVICE_KEY="<service-role-key>"   # Solo backend, nunca exponer en frontend

# JWT Secret (debe coincidir con Supabase JWT secret)
JWT_SECRET="<jwt-secret-del-proyecto-supabase>"

# CORS — origenes permitidos separados por coma
CORS_ORIGIN="http://localhost:5173,https://tu-dominio.com"

# Entorno
NODE_ENV="development"
```

> **Seguridad**: `.env` está en `.gitignore`. Nunca versionar credenciales. La `SERVICE_KEY` tiene privilegios de administrador en Supabase y solo debe usarse en el backend.

---

## 4. Base de Datos — Esquema

### Diagrama conceptual

```
usuarios ──< inscripciones >── eventos
usuarios ──< canjes >── recompensas
usuarios ──< captacion_novatos
usuarios ──< disponibilidades
usuarios ──< logs_actividad
productos (independiente)
recompensas (independiente)
```

### Tablas

#### `usuarios`

| Campo               | Tipo            | Descripción                                    |
| ------------------- | --------------- | ---------------------------------------------- |
| `id_usuario`        | UUID (PK)       | Mismo UUID que Supabase Auth → clave de enlace |
| `email`             | String (unique) | Email del usuario                              |
| `nombre`            | String          | Nombre                                         |
| `apellidos`         | String          | Apellidos                                      |
| `rol`               | Enum            | `admin`, `empleado`, `jugador`                 |
| `nivel_experiencia` | Enum            | `novato`, `intermedio`, `veterano`             |
| `puntos_fidelidad`  | Int             | Puntos canjeables acumulados                   |
| `foto_perfil_url`   | String?         | URL en Supabase Storage                        |
| `bio`               | String?         | Descripción personal                           |
| `telefono`          | String?         | Teléfono de contacto                           |
| `fecha_nacimiento`  | DateTime?       | Para validar edad                              |
| `activo`            | Boolean         | Soft delete de usuario                         |
| `createdAt`         | DateTime        | Timestamp de creación                          |
| `updatedAt`         | DateTime        | Timestamp de última modificación               |

#### `eventos`

| Campo           | Tipo      | Descripción                                                |
| --------------- | --------- | ---------------------------------------------------------- |
| `id_evento`     | UUID (PK) | Identificador único                                        |
| `titulo`        | String    | Nombre del evento                                          |
| `tipo_evento`   | Enum      | `torneo`, `iniciacion`, `taller`, `sesion_rol`, `especial` |
| `fecha`         | DateTime  | Fecha del evento                                           |
| `hora_inicio`   | String    | Formato HH:MM                                              |
| `hora_fin`      | String?   | Formato HH:MM                                              |
| `lugar`         | String    | Ubicación                                                  |
| `cupo_maximo`   | Int       | Límite de participantes                                    |
| `descripcion`   | String?   | Texto descriptivo                                          |
| `costo`         | Float?    | Precio de entrada                                          |
| `sistema_juego` | String?   | Sistema de juego utilizado                                 |
| `estado_evento` | Enum      | `programado`, `en_curso`, `finalizado`, `cancelado`        |
| `puntos_1/2/3`  | Int       | Puntos para 1er/2do/3er puesto                             |
| `id_creador`    | UUID      | FK a `usuarios.id_usuario`                                 |
| `activo`        | Boolean   | Soft delete                                                |

#### `inscripciones`

| Campo               | Tipo      | Descripción                     |
| ------------------- | --------- | ------------------------------- |
| `id_inscripcion`    | UUID (PK) |                                 |
| `id_usuario`        | UUID      | FK a `usuarios`                 |
| `id_evento`         | UUID      | FK a `eventos`                  |
| `fecha_inscripcion` | DateTime  | Timestamp de inscripción        |
| `estado`            | String    | Estado de participación         |
| `puntos_ganados`    | Int       | Puntos asignados tras el evento |

#### `productos`

| Campo             | Tipo      | Descripción                                        |
| ----------------- | --------- | -------------------------------------------------- |
| `id_producto`     | UUID (PK) |                                                    |
| `nombre`          | String    | Nombre del producto                                |
| `categoria`       | Enum      | `WARGAMES`, `ROL`, `MESA`, `PINTURA`, `ACCESORIOS` |
| `precio`          | Float     | Precio de venta                                    |
| `precio_original` | Float?    | Precio tachado (para mostrar descuento)            |
| `marca`           | String?   | Fabricante/editorial                               |
| `descripcion`     | String?   | Descripción del producto                           |
| `stock`           | Int       | Unidades disponibles                               |
| `stock_minimo`    | Int       | Alerta de stock bajo                               |
| `imagen_url`      | String?   | URL en Supabase Storage                            |
| `popular`         | Boolean   | Badge "Popular"                                    |
| `es_nuevo`        | Boolean   | Badge "Nuevo"                                      |
| `id_creador`      | UUID      | FK a `usuarios.id_usuario`                         |
| `activo`          | Boolean   | Soft delete                                        |

#### `recompensas`

| Campo           | Tipo                    | Descripción                                             |
| --------------- | ----------------------- | ------------------------------------------------------- |
| `id_recompensa` | Int (PK, autoincrement) |                                                         |
| `nombre`        | String                  | Nombre de la recompensa                                 |
| `descripcion`   | String?                 | Descripción                                             |
| `tipo`          | Enum                    | `descuento`, `producto_gratis`, `acceso_evento`, `otro` |
| `costo_puntos`  | Int                     | Puntos necesarios para canjear                          |
| `activo`        | Boolean                 | Soft delete                                             |

---

## 5. Autenticación y Seguridad

### Cómo funciona la autenticación

GoblinHub utiliza **Supabase Auth** como proveedor de identidad y el backend actúa como **Resource Server** que valida los tokens JWT emitidos por Supabase.

```
[Frontend]          [Backend]            [Supabase Auth]
    |                   |                      |
    |── POST /signin ──>|── verify creds ──────>|
    |                   |<── JWT tokens ────────|
    |<── tokens ────────|                      |
    |                   |                      |
    |── GET /me ────────>|                      |
    | (Authorization:   |── validate JWT ──────>|
    |  Bearer <token>)  |<── user data ─────────|
    |<── user data ─────|                      |
```

### SupabaseAuthGuard

```typescript
// modules/supabase/guard/supabse-auth.guard.ts
```

El guard extrae el token del header `Authorization: Bearer <token>` y lo valida contra el JWT Secret de Supabase. Si el token es válido, inyecta el payload en `request.user` para que los controladores puedan acceder al `id_usuario`.

### RolesGuard + @Roles() Decorator

El control de acceso por rol funciona en dos pasos:

1. `SupabaseAuthGuard` autentica al usuario y obtiene su `id_usuario`.
2. `RolesGuard` consulta en la tabla `usuarios` el campo `rol` y lo compara con los roles requeridos por el endpoint (definidos con `@Roles('admin', 'empleado')`).

```typescript
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('admin')
@Delete(':id')
async deleteEvento(@Param('id') id: string) { ... }
```

### Medidas de Seguridad Implementadas

| Medida                            | Implementación                                                       | Por qué                                                                             |
| --------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Helmet**                        | `app.use(helmet())` en `main.ts`                                     | Configura headers HTTP seguros (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) |
| **CORS Whitelist**                | `origin: corsOrigins.split(',')`                                     | Solo permite requests desde dominios autorizados                                    |
| **Rate Limiting**                 | `ThrottlerModule` — 10 req/min global                                | Previene ataques de fuerza bruta y DDoS básico                                      |
| **Auth Rate Limiting**            | 5 req/90s en `/auth/signin` y `/forgot-password`                     | Protección específica contra brute-force de credenciales                            |
| **DTO Validation**                | `class-validator` + `whitelist: true` + `forbidNonWhitelisted: true` | Rechaza campos no declarados en el DTO; previene mass assignment                    |
| **SQL Injection**                 | Prisma ORM con queries parametrizados                                | Nunca concatena strings en queries SQL                                              |
| **Path Traversal**                | Validación de filename en Backup con regex                           | Previene leer archivos del sistema con `../../../etc/passwd`                        |
| **File Upload**                   | Validación MIME type + límite 5MB                                    | Previene subida de ejecutables o archivos gigantes                                  |
| **Soft Delete**                   | Campo `activo: false` en lugar de DELETE real                        | Permite auditoría y recuperación de datos                                           |
| **Prisma en modo driverAdapters** | `@prisma/adapter-pg`                                                 | Conexión directa a PostgreSQL via `pg` driver                                       |

### Flujo de Renovación de Token

El frontend gestiona la expiración del access_token automáticamente:

1. Request con token expirado → Backend devuelve `401 Unauthorized`.
2. Interceptor de Axios hace `POST /auth/refresh-token` con el `refresh_token`.
3. Si el refresh es válido: se actualiza el `access_token` en `localStorage` y se reintenta el request original.
4. Si el refresh falla (token revocado o expirado): se limpia `localStorage` y se redirige a `/login`.

---

## 6. Módulos y Endpoints

### 6.1 Módulo Auth

**Base URL**: `/auth`

| Método   | Endpoint                | Auth | Descripción                               |
| -------- | ----------------------- | ---- | ----------------------------------------- |
| `POST`   | `/auth/signin`          | —    | Login con email y password                |
| `POST`   | `/auth/signup`          | —    | Registro de nuevo usuario                 |
| `POST`   | `/auth/refresh-token`   | —    | Renovar access_token con refresh_token    |
| `GET`    | `/auth/me`              | JWT  | Obtener perfil del usuario autenticado    |
| `GET`    | `/auth/verify`          | JWT  | Verificar si el token sigue siendo válido |
| `POST`   | `/auth/forgot-password` | —    | Solicitar email de reset de contraseña    |
| `POST`   | `/auth/reset-password`  | —    | Cambiar contraseña con token de reset     |
| `PATCH`  | `/auth/me`              | JWT  | Actualizar datos del perfil               |
| `PUT`    | `/auth/me/foto`         | JWT  | Subir o reemplazar foto de perfil         |
| `DELETE` | `/auth/me/foto`         | JWT  | Eliminar foto de perfil                   |

#### POST /auth/signin

```json
// Request Body
{
  "email": "usuario@ejemplo.com",
  "password": "MiPassword123!"
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
  "password": "MinPass1!",
  "nombre": "Juan",
  "apellidos": "García López",
  "fecha_nacimiento": "1995-05-15",
  "telefono": "612345678", // opcional
  "bio": "Me gustan los wargames", // opcional
  "nivel_experiencia": "novato" // novato | intermedio | veterano
}
```

#### PATCH /auth/me

```json
// Request Body (todos opcionales)
{
  "nombre": "Nuevo nombre",
  "apellidos": "Nuevos apellidos",
  "telefono": "699000111",
  "bio": "Nueva bio",
  "nivel_experiencia": "intermedio"
}
```

---

### 6.2 Módulo Events

**Base URL**: `/events`

| Método   | Endpoint                    | Auth | Roles           | Descripción                      |
| -------- | --------------------------- | ---- | --------------- | -------------------------------- |
| `GET`    | `/events`                   | —    | —               | Listar todos los eventos activos |
| `GET`    | `/events?name=xxx`          | —    | —               | Buscar eventos por nombre        |
| `GET`    | `/events/:id`               | —    | —               | Detalle de un evento             |
| `POST`   | `/events`                   | JWT  | admin, empleado | Crear nuevo evento               |
| `PUT`    | `/events/:id`               | JWT  | admin, empleado | Editar evento                    |
| `DELETE` | `/events/:id`               | JWT  | admin           | Soft delete                      |
| `POST`   | `/events/:id/inscripcion`   | JWT  | cualquier rol   | Inscribirse al evento            |
| `GET`    | `/events/:id/inscripciones` | JWT  | admin, empleado | Ver inscripciones del evento     |

#### POST /events

```json
{
  "titulo": "Torneo Age of Sigmar Febrero",
  "tipo_evento": "torneo", // torneo | iniciacion | taller | sesion_rol | especial
  "fecha": "2026-04-15",
  "hora_inicio": "10:00",
  "hora_fin": "18:00", // opcional
  "lugar": "Sala principal",
  "cupo_maximo": 16,
  "descripcion": "...", // opcional
  "costo": 5.0, // opcional
  "sistema_juego": "Age of Sigmar 4a Edición", // opcional
  "puntos_premio_1": 300,
  "puntos_premio_2": 150,
  "puntos_premio_3": 75
}
```

#### Scheduler automático de eventos

El módulo incluye un `@Cron` que se ejecuta periódicamente para actualizar el estado de los eventos:

- `programado` → `en_curso` cuando llega la `fecha + hora_inicio`
- `en_curso` → `finalizado` cuando llega la `hora_fin`

---

### 6.3 Módulo Products

**Base URL**: `/productos`

| Método   | Endpoint                    | Auth | Roles           | Descripción                        |
| -------- | --------------------------- | ---- | --------------- | ---------------------------------- |
| `GET`    | `/productos`                | —    | —               | Listar todos los productos activos |
| `GET`    | `/productos/:id`            | —    | —               | Detalle de producto                |
| `GET`    | `/productos/categoria/:cat` | —    | —               | Filtrar por categoría              |
| `POST`   | `/productos`                | JWT  | admin, empleado | Crear producto                     |
| `PUT`    | `/productos/:id`            | JWT  | admin, empleado | Editar producto                    |
| `DELETE` | `/productos/:id`            | JWT  | admin           | Soft delete                        |

#### Categorías disponibles

`WARGAMES` · `ROL` · `MESA` · `PINTURA` · `ACCESORIOS`

#### POST /productos

```json
{
  "nombre": "Warhammer 40.000 Starter Set",
  "categoria": "WARGAMES",
  "precio": 49.99,
  "precio_original": 59.99, // opcional — muestra precio tachado
  "marca": "Games Workshop", // opcional
  "descripcion": "...", // opcional
  "stock": 10,
  "imagen_url": "https://...", // opcional — URL de Supabase Storage
  "popular": true, // opcional — badge Popular
  "es_nuevo": false // opcional — badge Nuevo
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
  "descripcion": "...", // opcional
  "tipo": "descuento", // descuento | producto_gratis | acceso_evento | otro
  "costo_puntos": 500
}
```

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

- Si no es GIF: convierte a WebP con quality 80 (reduce peso ~60-70%)
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

- El `filename` es validado con regex `^backup_[\d-_]+\.sql$` antes de usarse en el comando shell — previene path traversal y command injection.
- La restauración usa `--single-transaction` en `psql` para que un fallo parcial haga rollback completo.
- Los archivos de backup se almacenan en `./backups/` (no en BD ni cloud).

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
// Ejemplo: EventsPrismaRepository
@Injectable()
export class EventsPrismaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.eventos.findMany({ where: { activo: true } });
  }
}
```

Los use-cases dependen de la abstracción del repositorio, no de Prisma directamente.

---

## 8. Testing

### Cobertura de Tests

Los tests unitarios se centran en los use-cases. Para correr con reporte de cobertura:

```bash
npm run test:cov
```

Los módulos cubiertos por tests son:

- `modules/events/application/use-case/**`
- `modules/products/aplication/use-case/**`
- `modules/rewards/aplication/use-case/**`
- `modules/supabase/application/use-case/**`
- `modules/supabase/infrastructure/controller/**`
- `modules/supabase/guard/**`

El reporte HTML se genera en `/coverage/index.html`.

### Test E2E

```bash
npm run test:e2e
```

Usa `supertest` para levantar la aplicación en memoria y hacer requests HTTP reales contra `app.e2e-spec.ts`.

---

## 9. Scripts útiles

```bash
# Desarrollo con hot-reload
npm run start:dev

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

# Lint + Type check + Build + Tests (pipeline completo)
npm run api

# Backup manual (script de shell)
bash scripts/backup.sh

# Restaurar backup (script de shell)
bash scripts/restore.sh
```
