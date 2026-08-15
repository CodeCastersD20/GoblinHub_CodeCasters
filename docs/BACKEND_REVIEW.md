# Auditoría técnica — GoblinHub API

**Alcance:** `goblinhub-api/` (NestJS 11 + Prisma 7/adapter-pg + PostgreSQL vía Supabase + Supabase Auth/Storage).
**Fecha:** 2026-08-02. **Método:** revisión estática de código y esquema — sin benchmark de carga ejecutado; las cifras "antes/después" son estimaciones razonadas a partir del plan de ejecución esperado (seq scan vs index scan, nº de queries, RTT), marcadas explícitamente como tal.

---

## 0. Resumen ejecutivo

| # | Hallazgo | Área | Severidad | Esfuerzo |
|---|---|---|---|---|
| 1 | Cero índices en el esquema (ni en FKs) | BD | 🔴 P0 | S |
| 2 | Auth = 1 RTT externo + 2 queries por request | Performance/Seguridad | 🔴 P0 | M |
| 3 | `findAllForAdmin` sin paginar, over-fetch de relaciones | Performance | 🔴 P0 | S |
| 4 | Password de BD visible en `ps aux` (`pg_dump`/`psql`) | Seguridad | 🔴 P0 | S |
| 5 | Backups en disco local efímero, sin rotación/offsite | Infra | 🔴 P0 | M |
| 6 | Throttler en memoria, no distribuido, límite roto | Seguridad/Infra | 🟠 P1 | M |
| 7 | Interceptor de logs = 1 INSERT síncrono por mutación | Performance | 🟠 P1 | M |
| 8 | `count()` completo en cada página de logs | Performance | 🟠 P1 | S |
| 9 | Dashboard = ~13 queries sin caché | Performance | 🟠 P1 | M |
| 10 | Cron corre en cada instancia (sin lock distribuido) | Infra | 🟠 P1 | M |
| 11 | `expireEvents` hace `updateMany` cada 60s sin índice, borra en vez de marcar estado | BD/Diseño | 🟠 P1 | S |
| 12 | `empleado` puede modificar el perfil de cualquier usuario, incl. admins | Seguridad | 🟠 P1 | S |
| 13 | `id_creador` sin FK real en Producto/Recompensa | BD | 🟠 P1 | M |
| 14 | Sin health check / métricas / tracing | Infra | 🟠 P1 | M |
| 15 | Sin Dockerfile ni pipeline de deploy | Infra | 🟠 P1 | M |
| 16 | Sin refresh-token rotation/revocación, endpoint sin throttle | Seguridad | 🟠 P1 | S |
| 17 | Listas vacías devuelven 404 en vez de `[]` | Calidad | 🟡 P2 | S |
| 18 | `try/catch` que traga la causa raíz (×4 en eventos, replicado en products/rewards) | Calidad | 🟡 P2 | S |
| 19 | Búsqueda por `contains` sin índice de texto | BD | 🟡 P2 | S |
| 20 | Ningún `findAll` pagina | Performance | 🟡 P2 | M |
| 21 | Repos de dominio: `abstract class` vs `interface` sin criterio | Arquitectura | 🟡 P2 | S |
| 22 | Lógica de negocio dentro del controller (`updateAdminUser`) | Arquitectura | 🟡 P2 | S |
| 23 | `/* istanbul ignore next */` en el módulo más sensible (auth) | Testabilidad | 🟡 P2 | M |
| 24 | Typos/inconsistencia de nombres (`aplication/`, `supabse-auth`, etc.) | Calidad | 🟡 P2 | S |
| 25 | Comentarios de andamiaje en producción | Calidad | 🟡 P2 | S |
| 26 | Middleware de redirect por heurística de headers | Arquitectura | 🟡 P2 | S |
| 27 | Sin pool configurado en `PrismaPg` | Performance | 🟡 P2 | S |
| 28 | Sin validación de env vars al arranque | Infra | 🟡 P2 | S |
| 29 | `DELETE /upload?url=` sin verificar pertenencia del recurso | Seguridad | 🟡 P2 | S |
| 30 | `sharp` sin límite de concurrencia | Performance | 🟡 P2 | M |
| 31 | `/auth/verify` expone el objeto Supabase completo | Seguridad | 🟡 P2 | S |

**Puntos positivos a mantener:** `.env` fuera del repo, backups `.sql` excluidos de git, `helmet` con CSP+HSTS, `ValidationPipe` estricto (`whitelist`+`forbidNonWhitelisted`), Swagger apagado en producción, rollback automático en registro (`register-user.use-case.ts:70`), guardas de propiedad ya presentes en borrado de eventos (`sd-event.use-case.ts:37`), arquitectura hexagonal consistente por módulo.

---

## 1. Eficiencia — cuellos de botella, N+1, memoria/CPU, latencia

### 1.1 Autenticación: 1 RTT externo + 2 queries en cada request protegido

Cada request con `@UseGuards(SupabaseAuthGuard)` ejecuta, en serie:

```ts
// validationT.use-case.ts:13
const { data: user, error } = await this.supabase.auth.getUser(token); // HTTP → Supabase

// supabse-auth.guard.ts:46-49
const profile = await this.prisma.usuario.findUnique({
  where: { id_usuario: result.user.id },
  select: { activo: true, deleted_at: true },
});
```

Y si la ruta tiene `@Roles(...)`, `RolesGuard` añade una **tercera** consulta:

```ts
// roles.guard.ts:41
const rol = await this.usuarioRepository.findRolById(userId); // findUnique adicional
```

**Impacto:** en un endpoint admin protegido (ej. `PATCH /auth/admin/users/:id`) hay 1 llamada HTTP a Supabase (~80-200 ms según región) + 2 roundtrips a Postgres, **antes** de ejecutar la lógica de negocio.

| Métrica | Antes (estimado) | Después (con caché de rol + validación local de JWT) |
|---|---|---|
| Latencia guard (P50) | ~120-250 ms | ~5-15 ms |
| Llamadas de red por request | 1 HTTP + 2 SQL | 0 HTTP + 0-1 SQL (cache hit) |
| Bajo 100 req/s concurrentes | satura el rate-limit de la API de Supabase | sin dependencia externa en el hot path |

**Causa raíz:** se usa `supabase.auth.getUser(token)` (llamada remota) en vez de validar el JWT localmente con el JWT secret/JWKS de Supabase (`jwt.verify` con `SUPABASE_JWT_SECRET`), que es instantáneo y no depende de red.

**Recomendación concreta:**
```ts
// en vez de supabase.auth.getUser(token) por request:
import { verify } from 'jsonwebtoken';
const payload = verify(token, process.env.SUPABASE_JWT_SECRET) as { sub: string; email: string; role: string };
```
Combinar con caché de rol (ver §2.1) para eliminar también los 2 SELECT.

### 1.2 `findAllForAdmin`: over-fetch + N+1 disfrazado de "include"

```ts
// usuario.repository.ts:89-121
const usuarios = await this.prisma.usuario.findMany({
  where: whereClause,          // sin filtrar deleted_at
  select: {
    ...
    inscripciones: { where: { deleted_at: null }, select: { id_inscripcion: true } },
  },
  orderBy: { created_at: 'desc' },
});
return usuarios.map((u) => ({ ...  eventos_asistidos: u.inscripciones.length }));
```

No es N+1 clásico (Prisma resuelve el `include` en una query con JOIN/subquery), pero:
- **Trae todas las filas** de `usuarios` sin `take`/`skip`.
- **Trae todas las inscripciones** de cada usuario solo para contar `.length` en memoria — con 500 usuarios y 20 inscripciones promedio, son 10.000 filas transportadas para calcular 500 números.
- No filtra `deleted_at: null` en `usuario` → expone cuentas dadas de baja al panel admin.

**Antes → después (estimado, 5.000 usuarios / 50.000 inscripciones):**

| | Antes | Después |
|---|---|---|
| Filas leídas | ~55.000 | ~50 (página) |
| Payload de red BD→app | proporcional a inscripciones totales | proporcional a `limit` |
| Uso de memoria Node por request | crece con el dataset completo | acotado |

**Fix:**
```ts
async findAllForAdmin(termino?: string, rolFiltro?: string, page = 1, limit = 20) {
  const where: FiltrosWhere = { deleted_at: null };
  ...
  const [usuarios, total] = await this.prisma.$transaction([
    this.prisma.usuario.findMany({
      where,
      select: {
        id_usuario: true, nombre: true, apellidos: true, nivel_experiencia: true,
        rol: true, activo: true, foto_perfil_url: true, created_at: true,
        _count: { select: { inscripciones: { where: { deleted_at: null } } } },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    this.prisma.usuario.count({ where }),
  ]);
  return { data: usuarios.map(u => ({ ...u, eventos_asistidos: u._count.inscripciones })), total, page, limit };
}
```
`_count` con `select` agregado evita traer las filas de `inscripciones` — Postgres calcula el `COUNT` en el propio plan.

### 1.3 Dashboard de métricas: ~13 queries en cada carga, sin caché

`get-dashboard-metrics.use-case.ts:44-134` dispara, por cada llamada a `GET /logs/dashboard/metrics`:
- 7 `count`/`aggregate` en paralelo (línea 50-81)
- 2 `count` más (línea 83-88)
- 3 `$queryRaw` de series mensuales (línea 101-106) — cada uno hace `DATE_TRUNC` + `GROUP BY` sobre toda la tabla desde `firstMonthStart`, sin índice de apoyo en `created_at`
- 3 `groupBy`/`findMany` para niveles, tipos y top usuarios (línea 108-113)

Total: **~15 queries** contra 6 tablas distintas, todas sin índice específico, en un endpoint que es candidato obvio a caché (los datos no cambian minuto a minuto).

| | Antes (estimado) | Después (Redis, TTL 5 min) |
|---|---|---|
| Queries por carga de dashboard | ~15 | 0 (cache hit) / ~15 (cache miss, 1 vez cada 5 min) |
| Latencia P50 | 150-400 ms (depende de volumen de `logs_actividad`) | <5 ms en hit |
| Carga sobre Postgres bajo 50 admins simultáneos viendo el dashboard | 750 queries/min | ~15 queries/5min |

### 1.4 `GET /logs`: `count()` completo en cada página

```ts
// prisma-log.repository.ts:62-64
const total = includeTotal
  ? await this.prisma.logs_Actividad.count({ where: whereCondition })
  : data.length;
```
`logs_actividad` crece sin límite (cada mutación escribe una fila — ver §1.5). Sin índice en las columnas de filtro (`tipo`, `id_usuario`, `fecha_hora`), el `COUNT` es un seq scan completo cada vez que el admin pagina.

**Fix corto plazo:** índice compuesto (ver §5) reduce el costo del scan. **Fix estructural:** paginación keyset (`WHERE fecha_hora < :cursor ORDER BY fecha_hora DESC LIMIT :n`) evita el `OFFSET` creciente y permite omitir `count()` exacto (usar "hay más" en vez de total exacto, o cachear el total).

### 1.5 Interceptor de auditoría: escritura síncrona en el hot path

```ts
// activity-log.interceptor.ts:48-61
return next.handle().pipe(
  tap(() => { void this.writeLog({...}); }),   // fire-and-forget, pero SIGUE siendo 1 INSERT por mutación
  ...
);
```
Es `void` (no bloquea la respuesta al cliente), lo cual es correcto, pero cada `POST/PUT/PATCH/DELETE` de la API genera 1 INSERT adicional en `logs_actividad` sin batching. Bajo carga de escritura alta (ej. import masivo de eventos), esto duplica el volumen de escrituras a Postgres y compite por conexiones del pool con las queries de negocio.

**Recomendación:** mover a una cola (BullMQ + Redis, ver §2.3) que agrupe inserts en lotes (`createMany` cada N segundos o N registros), o al menos usar `queueMicrotask`/`setImmediate` con un buffer en memoria con flush periódico.

### 1.6 `expireEvents`: full scan cada 60 segundos

```ts
// event.repository.ts:172-185
const result = await this.prisma.evento.updateMany({
  where: { deleted_at: null, fecha: { lt: today } },
  data: { deleted_at: now },
});
```
Sin índice en `(fecha, deleted_at)`, cada minuto es un seq scan de toda la tabla `eventos`. A 50.000 eventos históricos, son 1.440 seq scans/día solo para esta tarea.

### 1.7 Memoria — procesamiento de imágenes

```ts
// upload.service.ts:36
const compressed = await sharp(buffer).webp({ quality: 80 }).toBuffer();
```
`sharp` es nativo y libera el event loop, pero cada request retiene hasta 5 MB en `Buffer` (multer `memoryStorage`) + el buffer comprimido simultáneamente. Sin límite de concurrencia de uploads, N uploads paralelos = N×~10 MB en RSS. Con 20 uploads concurrentes → ~200 MB de picos, en un proceso Node típico de 512 MB-1 GB de límite en contenedor.

**Recomendación:** limitar concurrencia con un semáforo (`p-limit`) o mover la compresión a un worker/cola dedicada si el volumen de subidas crece.

---

## 2. Optimizaciones concretas

### 2.1 Caching

| Qué cachear | Dónde | TTL sugerido | Beneficio |
|---|---|---|---|
| Rol de usuario (`findRolById`) | Redis, key `role:{userId}` | 5 min o invalidar en `updateAdminUser` | Elimina el 3er roundtrip del guard en cada request con `@Roles` |
| Dashboard de métricas completo | Redis, key `dashboard:{months}` | 5 min | Elimina ~15 queries por carga |
| Perfil público de eventos/productos/recompensas (`findAll`) | Redis o `@nestjs/cache-manager` con invalidación en create/update/delete | 60 s | Reduce carga en endpoints públicos de alto tráfico |
| Validación de JWT | No cachear el resultado de red — **eliminar** la llamada de red (§1.1), validar localmente | — | Quita la dependencia dura de Supabase Auth del hot path |

```ts
// ejemplo: caché de rol en RolesGuard
const cached = await this.redis.get(`role:${userId}`);
const rol = cached ?? await this.usuarioRepository.findRolById(userId);
if (!cached && rol) await this.redis.setex(`role:${userId}`, 300, rol);
```
Invalidar la key `role:{userId}` en `updateUserForAdmin` cuando cambie `rol`.

### 2.2 Eager loading correcto (evitar el patrón actual de "traer todo y contar en memoria")

Sustituir todo `include: { relacion: { select: { id: true } } }` usado solo para `.length` por `_count`:

```ts
// antes (usuario.repository.ts:100-103)
inscripciones: { where: { deleted_at: null }, select: { id_inscripcion: true } }
// después
_count: { select: { inscripciones: { where: { deleted_at: null } } } }
```

### 2.3 Colas

Introducir **BullMQ + Redis** para:
1. **Logs de auditoría** (`ActivityLogInterceptor`): encolar el evento, un worker hace `createMany` en lotes de 50 o cada 2 s.
2. **Envío de emails** (forgot-password, confirmación) si actualmente son síncronos vía Supabase — verificar `forgot-password.use-case.ts`, y si bloquea el request, mover a cola.
3. **Backups**: aunque son cron, encolar como job permite reintentos automáticos y visibilidad (dashboard de BullMQ) en vez de un `try/catch` con solo `logger.error`.

### 2.4 Indexing

Ver sección 5 completa — resumen: 9 índices nuevos cubren el 100% de los `WHERE`/`ORDER BY` actuales sin índice de apoyo.

### 2.5 Cambios de arquitectura

- **JWT local + JWKS caché** en vez de `supabase.auth.getUser()` por request (§1.1).
- **Paginación keyset** en `logs_actividad` y `findAllForAdmin` en vez de `OFFSET`.
- **Cron con lock distribuido** (Redis `SET NX EX` o `pg_advisory_lock`) para que backup/expiración corran una sola vez aunque haya N réplicas (§ Infra 7.3).
- **Mover `EstadoEvento` a su propósito real**: usar `estado: finalizado` en vez de `deleted_at` para eventos pasados — el soft-delete debería reservarse para borrado real, no para "evento terminado" (afecta reportes y el propio dashboard, que cuenta `eventosRealizados` sobre `deleted_at: null`, mezclando conceptos).

---

## 3. Review senior — SOLID, DRY, testabilidad, legibilidad

### SOLID

- **SRP violado en el controller de auth.** `updateAdminUser` (`supabase-auth.controller.ts:288-312`) contiene lógica de autorización de campo-por-campo (sanitizado de DTO según rol) directamente en el controller. Debería vivir en un use-case (`UpdateAdminUserUseCase`) testeable sin levantar HTTP.
  ```ts
  // actual: controller decide QUÉ campos se pueden tocar según rol
  if (currentRole !== RolUsuario.admin) {
    const sanitizedDto: AdminUpdateUserDto = { nombre: dto.nombre, apellidos: dto.apellidos, nivel_experiencia: dto.nivel_experiencia };
    await this.usuarioRepository.updateUserForAdmin(id, sanitizedDto);
    ...
  }
  ```
  Esto es lógica de negocio (política de autorización por campo) en la capa de interfaz — mezcla dos responsabilidades y hace que cambiar la política de permisos requiera tocar el controller.

- **DIP aplicado a medias.** Unos módulos definen el contrato de repositorio como `abstract class` (`EventRepository`, `ProductRepository`, `RewardRepository`, `UsuarioRepository`), otros como `interface` (`ILogRepository`). Ambos son válidos en NestJS (DI funciona con clases abstractas via token, con interfaces requiere token string explícito), pero la inconsistencia dentro del mismo codebase es señal de que no hay una convención documentada — dificulta el onboarding.

- **OCP razonable** en los mappers (`event-status.mapper.ts`, `product-status.mapper.ts`, `reward-status.mapper.ts`) — buen uso de conversión domain↔Prisma aislada, fácil de extender sin tocar repos.

### DRY

- **Manejo de errores duplicado 4 veces** en `get-event.use-case.ts` (y patrón idéntico replicado en products/rewards): cada método hace `try { ... } catch (error) { if (HttpException) throw; throw new HttpException({Error: '...'}, 500) }`. Es el mismo bloque con distinto mensaje, repetido ~12 veces en el código base completo.
  ```ts
  // extraer a un decorador o filtro de excepción global
  @Catch()
  export class DomainExceptionFilter implements ExceptionFilter { ... }
  ```
  O más simple: un helper `wrapUseCaseError(fn, message)` que envuelva la llamada.

- **`mapToDomain` bien resuelto** como método privado único por repositorio (`event.repository.ts:49`, `product.repository.ts:16`, `Reward.repository.ts:15`) — patrón correcto, no lo toquen.

- **Los 3 controllers de escritura (events/products/rewards) repiten el mismo boilerplate** `if (!req.user) throw new UnauthorizedException(...)` en cada endpoint protegido. Con `SupabaseAuthGuard` ya garantizando `req.user` (o lanzando antes), este chequeo es defensivo pero redundante — considerar un decorador de parámetro `@CurrentUser()` que lance si falta, centralizando el check una sola vez.

### Testabilidad

- Buena cobertura de use-cases con `.spec.ts` dedicado por caso (`create-event.use-case.spec.ts`, etc.) — patrón correcto y consistente.
- **Problema:** `/* istanbul ignore next */` aparece 10 veces en `supabase-auth.controller.ts` y en varios use-cases de auth (`login-user.use-case.ts`, `signin.use-case.ts` según convención del resto del módulo). Esto excluye de la cobertura reportada exactamente el módulo de mayor riesgo (autenticación/autorización). El % de cobertura del pipeline de CI no refleja el riesgo real.
- **Lógica de negocio en el controller** (§SOLID) es por definición más cara de testear: requiere montar el controller completo con mocks de 3 repositorios en vez de testear una función pura.

### Legibilidad

- Nombrado en español consistente con dominio del negocio — correcto para el contexto.
- **Comentarios de proceso, no de código**, que deberían haberse quedado en el PR y no en el archivo final:
  ```ts
  // usuario.repository.ts:64,74,108-109
  // 1. Creamos un molde estricto (Type) para que TypeScript no se queje ...
  // 2. Usamos ese molde para construir la consulta sin usar "any"
  // 3. Prisma ejecuta la consulta
  // 4. Mapeamos los resultados. ¡Nota que ya no dice "(u: any)"! Ahora TypeScript es feliz.
  ```
  ```ts
  // prisma-log.repository.ts:126
  // En lugar de usar el Enum de Prisma o 'any', lo parseamos con la magia de TypeScript
  ```
  Ninguno explica un porqué no obvio — narran el propio proceso de escribir el código. Eliminar.

### Uso de servicios/repositorios

- El patrón repositorio está bien aplicado en general: domain define el contrato, infrastructure lo implementa con Prisma, application solo conoce el contrato. Correcto.
- **Excepción:** `PrismaService` se inyecta directamente en `ActivityLogInterceptor` (capa de infraestructura transversal) — aceptable por ser un interceptor global, pero rompe la regla si en el futuro se decide encolar los logs (§2.3), porque el interceptor tendría que dejar de hablar con Prisma directamente.

---

## 4. Calidad de código

### Code smells

1. **Excepciones genéricas con mensaje en inglés mezclado con dominio en español** — inconsistencia de idioma entre `HttpException({ Error: 'No events found' }, 404)` y el resto del dominio en español. Menor, pero afecta consistencia de API pública (los mensajes de error los ve el frontend).
2. **`Error` como key de payload de excepción** (`{ Error: '...' }`) en vez de seguir el shape estándar de Nest (`{ statusCode, message, error }`) — rompe el contrato que Swagger/clientes esperan de una excepción HTTP de Nest.
3. **Naming inconsistente de carpetas**: `aplication/` (products, rewards) vs `application/` (events, supabase, logs) — typo congelado en la estructura de directorios, ya usado en imports en decenas de archivos; corregirlo ahora es un refactor de imports masivo pero cuanto más se tarde, peor.
4. **Archivos con typos en nombre**: `supabse-auth.guard.ts`, `soft-deled-product.use-case.ts`, DTO `CreateTesruserDto`.
5. **Casing inconsistente de archivos**: `Reward.repository.ts` (PascalCase) entre el resto en kebab-case (`event.repository.ts`, `product.repository.ts`).

### Riesgos de mantenimiento

- **El middleware de redirección en `main.ts:100-124` es frágil por diseño**: decide si una request es "del frontend" o "navegación directa" inspeccionando `Origin`/`Authorization`/`X-Requested-With`/`Accept`. Cualquier cliente HTTP que no mande esos headers (ej. un healthcheck de Kubernetes, un webhook, un test e2e mal configurado) recibe un `302` en vez de la respuesta esperada. Es lógica de presentación mezclada en el bootstrap de la app.
- **Falta de una capa de mapeo de errores de Prisma** (`P2025` not found, `P2002` unique constraint) — todos los repos dejan que la excepción de Prisma se propague cruda hacia el use-case, que la convierte en un 500 genérico. Un registro no encontrado en un `update()` debería mapear a 404, no a 500.
- **Soft delete inconsistente en semántica**: se usa `deleted_at` tanto para "borrado real" como para "evento ya pasó" (`expireEvents`). Un reporte futuro que necesite distinguir "eventos cancelados por admin" de "eventos que ya sucedieron" no puede hacerlo sin tocar el modelo.

### Refactors concretos

**Refactor 1 — extraer manejo de error repetido (events/products/rewards use-cases):**
```ts
// antes: repetido en 4 métodos de get-event.use-case.ts
async getAllEvents(): Promise<Event[]> {
  try {
    const events = await this.eventRepository.findAll();
    if (!events || events.length === 0) throw new HttpException({ Error: 'No events found' }, 404);
    return events;
  } catch (error) {
    if (error instanceof HttpException) throw error;
    throw new HttpException({ Error: 'An error occurred while retrieving events' }, 500);
  }
}

// después: lista vacía = 200 [], errores de infraestructura via exception filter global
async getAllEvents(): Promise<Event[]> {
  return this.eventRepository.findAll(); // [] si no hay resultados — el cliente decide el estado vacío
}
```
Un `AllExceptionsFilter` global captura cualquier error no controlado y lo traduce a 500 con logging, sin necesidad de `try/catch` repetido en cada método.

**Refactor 2 — mover política de autorización de campos fuera del controller:**
```ts
// application/use-case/update-admin-user.use-case.ts (nuevo)
@Injectable()
export class UpdateAdminUserUseCase {
  constructor(private readonly usuarios: UsuarioRepository) {}

  async execute(actorId: string, targetId: string, dto: AdminUpdateUserDto): Promise<void> {
    const actorRole = await this.usuarios.findRolById(actorId);
    if (!actorRole) throw new UnauthorizedException('User role not found');

    if (actorRole !== RolUsuario.admin) {
      const { nombre, apellidos, nivel_experiencia } = dto;
      return this.usuarios.updateUserForAdmin(targetId, { nombre, apellidos, nivel_experiencia });
    }
    return this.usuarios.updateUserForAdmin(targetId, dto);
  }
}
```
El controller queda en 3 líneas y la política de campos es unit-testeable sin HTTP.

**Refactor 3 — `_count` en vez de `include` + `.length` (ya mostrado en §2.2).**

---

## 5. Base de datos — índices, escalabilidad, locks, cardinalidad

### 5.1 Uso de índices — estado actual

`prisma/schema.prisma` no tiene **ningún** `@@index`. Las únicas restricciones son 4 `UNIQUE` heredadas de la migración inicial (`usuarios_email_key` — nota: ya no existe `email` en el modelo actual, esta constraint es reliquia de una versión anterior del esquema y debería auditarse; `intereses_nombre_interes_key`, `inscripciones_id_evento_id_usuario_key`, `captacion_novatos_id_usuario_key`).

**PostgreSQL no crea índice automático en columnas de foreign key** (a diferencia de la PK). Esto significa que **todo JOIN o filtro por FK es seq scan**:

| Columna FK | Usada en | Consulta afectada |
|---|---|---|
| `inscripciones.id_evento` | conteo de inscritos por evento, dashboard `asistenciaPorMes` | seq scan de `inscripciones` |
| `inscripciones.id_usuario` | `findAllForAdmin` (§1.2), `getTopUsuarios` | seq scan |
| `logs_actividad.id_usuario` | `GET /logs?usuarioId=` | seq scan |
| `eventos.id_creador` | filtrar "mis eventos creados" (futuro), guard de propiedad en `sd-event.use-case.ts:37` | seq scan si se filtra por creador |
| `canjes.id_usuario`, `canjes.id_recompensa` | historial de canjes por usuario | seq scan |
| `disponibilidades.id_usuario` | perfil de disponibilidad | seq scan |
| `usuario_intereses.*` | ya tiene PK compuesta `(id_usuario, id_interes)` — cubre `id_usuario` como prefijo, no cubre búsquedas solo por `id_interes` | parcial |

### 5.2 Índices propuestos

```sql
-- FKs de alto uso, parciales por soft-delete (más pequeños, más rápidos)
CREATE INDEX CONCURRENTLY idx_inscripciones_evento
  ON inscripciones(id_evento) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY idx_inscripciones_usuario
  ON inscripciones(id_usuario) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY idx_canjes_usuario
  ON canjes(id_usuario) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY idx_canjes_recompensa
  ON canjes(id_recompensa) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY idx_disponibilidades_usuario
  ON disponibilidades(id_usuario) WHERE deleted_at IS NULL;

-- filtros de rango usados por el scheduler y por listados
CREATE INDEX CONCURRENTLY idx_eventos_fecha
  ON eventos(fecha) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY idx_eventos_creador
  ON eventos(id_creador) WHERE deleted_at IS NULL;

-- logs: filtro + orden más común (GET /logs, GET /logs/recent)
CREATE INDEX CONCURRENTLY idx_logs_fecha_hora
  ON logs_actividad(fecha_hora DESC);
CREATE INDEX CONCURRENTLY idx_logs_usuario_fecha
  ON logs_actividad(id_usuario, fecha_hora DESC);
CREATE INDEX CONCURRENTLY idx_logs_tipo
  ON logs_actividad(tipo);

-- admin y catálogo
CREATE INDEX CONCURRENTLY idx_usuarios_rol_activo
  ON usuarios(rol, activo) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY idx_productos_categoria
  ON productos(categoria) WHERE deleted_at IS NULL AND activo = true;

-- búsqueda por texto: reemplaza el ILIKE '%x%' actual (searchByName, findAllForAdmin)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX CONCURRENTLY idx_eventos_titulo_trgm
  ON eventos USING gin (titulo gin_trgm_ops);
CREATE INDEX CONCURRENTLY idx_usuarios_nombre_trgm
  ON usuarios USING gin ((nombre || ' ' || apellidos) gin_trgm_ops);
```

Equivalente en `schema.prisma` (para que quede versionado en el modelo, no solo en SQL suelto):
```prisma
model Inscripcion {
  ...
  @@index([id_evento])
  @@index([id_usuario])
}

model Evento {
  ...
  @@index([fecha])
  @@index([id_creador])
}

model Logs_Actividad {
  ...
  @@index([fecha_hora(sort: Desc)])
  @@index([id_usuario, fecha_hora(sort: Desc)])
  @@index([tipo])
}
```
`CONCURRENTLY` evita bloquear escrituras durante la creación — imprescindible si se aplica en producción con tablas ya pobladas (no puede ejecutarse dentro de una transacción, así que Prisma Migrate necesita el flag `--create-only` + edición manual del SQL generado).

### 5.3 Escalabilidad

- **`logs_actividad` con PK `BigInt @autoincrement`** crecerá sin límite — con 1 INSERT por cada mutación de la API (§1.5), en un sistema con tráfico moderado esto son cientos de miles de filas al mes. Candidato directo a **particionado por rango de fecha** (`PARTITION BY RANGE (fecha_hora)`, partición mensual) para que las queries de "últimos N días" (mayoría de los casos de uso admin) solo toquen 1-2 particiones y para poder hacer `DROP PARTITION` como retención en vez de `DELETE` masivo.
- **`Usuario` es tabla central con auto-referencia** (`usuarioCreador`/`usuariosCreados`) — bien modelado, sin problema de escalabilidad mientras tenga índice en la FK (ya cubierta por ser parte de una relación `@relation`, Prisma sí indexa la columna del lado "many" en algunas versiones — **verificar** con `\d usuarios` en producción; si no está, añadir `@@index([id_usuario_creador])`).

### 5.4 Locks / contención

- **`updateMany` de `expireEvents` cada 60 s** (§1.6) toma locks de fila sobre cada evento vencido que actualiza. Sin índice en `fecha`, Postgres además debe tomar un lock de tabla más amplio durante el seq scan bajo `UPDATE`, aumentando la ventana de contención con otras escrituras a `eventos` (ej. un admin editando un evento a la misma hora del cron).
- **No se detectaron transacciones largas ni `SELECT ... FOR UPDATE`** — no hay riesgo evidente de deadlock por ahora, pero tampoco hay control de concurrencia optimista (`updated_at` como campo de versión) en updates críticos como `puntos_fidelidad` o `stock` — dos requests concurrentes actualizando el mismo `Producto.stock` pueden pisarse sin que Prisma lo detecte (no hay `@@version` ni chequeo de `updated_at` en el `WHERE` del `update`).

### 5.5 Cardinalidad

- `RolUsuario` (3 valores), `EstadoEvento` (4), `TipoEvento` (5), `CategoriaProducto` (5): baja cardinalidad, aptos para índice solo en combinación con otra columna de mayor selectividad (de ahí `idx_usuarios_rol_activo` compuesto, no un índice solo en `rol`).
- `id_usuario`/`id_evento` (UUID): alta cardinalidad, buenos candidatos a índice simple — ya cubiertos arriba.
- `logs_actividad.tipo` (4 valores): igual que roles, mejor combinado (`idx_logs_usuario_fecha` cubre más casos reales que un índice solo en `tipo`).

---

## 6. Seguridad

### 6.1 Manejo de tokens (JWT)

- El backend **no valida el JWT localmente**: delega el 100% de la verificación a una llamada de red a `supabase.auth.getUser(token)` (`validationT.use-case.ts:13`). Funcionalmente correcto (Supabase revoca/verifica), pero:
  - Acopla la disponibilidad de la API completa a la disponibilidad de Supabase Auth.
  - No hay validación de `exp`/`aud`/`iss` local antes de gastar la llamada de red — un token obviamente expirado o malformado igual dispara la llamada HTTP.
- **`POST /auth/refresh-token` no tiene `@Throttle`**, a diferencia de `signin`/`signup`/`forgot-password`/`reset-password` (todos con `limit: 5, ttl: 90000`). Un atacante con un refresh token robado puede generar tokens de acceso indefinidamente sin límite de tasa.
- **No hay revocación/logout del lado del servidor**: no se ve invalidación de sesión salvo lo que Supabase gestione internamente. Si un usuario reporta robo de sesión, no hay endpoint para invalidar tokens activos.

### 6.2 Validación de roles/permisos

`RolesGuard` (`roles.guard.ts`) es correcto en su mecánica (`@Roles()` + `Reflector`), pero:

- **`updateAdminUser` permite a `empleado` modificar el perfil de cualquier usuario, incluidos otros `empleado` y `admin`** (`supabase-auth.controller.ts:279-312`). Solo se bloquean los campos `rol` y `activo`; `nombre`, `apellidos`, `nivel_experiencia` quedan abiertos sobre cualquier `:id`, sin chequeo de que el `empleado` tenga alguna relación con el usuario objetivo.
- **Sin protección contra "último admin"**: nada impide que un `admin` se autodesactive (`DELETE /auth/admin/users/:id` sobre su propio ID) o desactive al último admin restante, dejando la aplicación sin ningún usuario con rol admin.
- **`softDeleteForAdmin` no verifica que el actor no se esté auto-eliminando** ni registra quién ejecutó la acción más allá del interceptor genérico de logs.

### 6.3 Riesgos de escalación de privilegios

**PoC — un `empleado` renombra a un `admin`:**
```bash
# empleado autenticado (token válido, rol=empleado)
curl -X PATCH https://api.goblinhub.example/auth/admin/users/<id-de-un-admin> \
  -H "Authorization: Bearer $EMPLEADO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Cuenta Comprometida"}'
# 200 OK — el empleado no debería poder tocar el perfil de un admin en absoluto
```
No es escalación de rol en sentido estricto (no cambia `rol`/`activo`), pero es **modificación no autorizada de identidad de un usuario de mayor privilegio**, lo cual puede usarse para ingeniería social interna o para sabotear la cuenta de un admin.

**PoC — borrado de imagen ajena:**
```bash
# empleado autenticado, borra la foto de perfil de OTRO usuario o la imagen de un producto que no creó
curl -X DELETE "https://api.goblinhub.example/upload?url=https://xxx.supabase.co/storage/v1/object/public/images/profiles/<otro-uuid>/foto.jpg" \
  -H "Authorization: Bearer $EMPLEADO_TOKEN"
# 200 OK — upload.controller.ts:103 solo valida que la URL pertenezca al bucket, no al recurso del actor
```

### 6.4 Exposición de endpoints

- **`GET /auth/verify` devuelve el objeto `user` completo de Supabase** (`supabase-auth.controller.ts:139-143`), que incluye `user_metadata`, `app_metadata`, `identities`, timestamps de confirmación, etc. — más información de la necesaria para un simple "el token es válido".
- **`POST /auth/test/signin` existe en producción como ruta**, protegida por `@Roles(admin)` + chequeo `NODE_ENV === 'production'` dentro del handler (`supabase-auth.controller.ts:167-180`). Doble defensa razonable, pero la ruta sigue registrada en el árbol de Swagger/OpenAPI si Swagger estuviera accidentalmente activo en prod — reforzar excluyéndola del build de producción vía guard de módulo, no solo de método.
- **`GET /events`, `GET /productos`, `GET /rewards` son públicos** (correcto por diseño) pero sin rate-limit específico más allá del throttler global de 10 req/min — ver §6.7 sobre por qué ese límite es inefectivo bajo escalado horizontal.

### 6.5 Manejo de sesiones

No hay gestión de sesión propia del backend — se delega enteramente a Supabase (access + refresh token). Esto es razonable arquitectónicamente, pero implica que:
- No hay forma de listar "sesiones activas" de un usuario desde la API propia.
- No hay invalidación selectiva (ej. "cerrar sesión en todos los dispositivos") sin llamar directamente a la Admin API de Supabase, que no está expuesta actualmente.

### 6.6 Vulnerabilidades identificadas y cómo explotarlas

| # | Vulnerabilidad | Cómo explotarla | Severidad |
|---|---|---|---|
| A | `empleado` modifica perfil de `admin` | PoC §6.3 | Alta |
| B | `DELETE /upload` sin verificar dueño | PoC §6.3 | Media-Alta |
| C | Refresh-token sin throttle | Loop de `POST /auth/refresh-token` con un refresh token filtrado (ej. de un log mal configurado) → tokens de acceso ilimitados sin fricción | Media |
| D | Rate-limit no distribuido | Con 2+ instancias tras un LB, alternar requests entre instancias evita el contador de `ThrottlerGuard` (en memoria por proceso) → bypass efectivo del límite de 10 req/min o de 5 intentos de login | Media (crece con el nº de réplicas) |
| E | `/auth/verify` sobre-expone metadata | Cualquier cliente autenticado obtiene metadata interna de Supabase que no necesita para "verificar token" | Baja |
| F | Password de BD en `ps aux` durante backup/restore | Cualquier proceso con acceso al host (otro contenedor compartiendo namespace de procesos, un usuario no-root con `ps aux`) lee `DATABASE_URL` completo mientras el backup corre | Alta (si el runtime no aísla bien los procesos) |

### 6.7 Mitigaciones propuestas

1. **A/B** — reescribir `updateAdminUser`/`deleteImage` para exigir que el actor sea `admin`, o que sea `empleado` operando sobre un recurso cuyo `id_creador`/dueño coincida con él, replicando el patrón que **ya existe** en `sd-event.use-case.ts:37` (`isEmpleado && event.id_creador !== id_usuario → Forbidden`). Ese patrón debe generalizarse a usuarios e imágenes.
2. **C** — añadir `@Throttle({ default: { limit: 10, ttl: 60000 } })` a `refresh-token`, y considerar rotación de refresh token en cada uso (invalidar el anterior).
3. **D** — mover `ThrottlerStorage` a Redis (`@nestjs/throttler` soporta `ThrottlerStorageRedisService` vía `nestjs-throttler-storage-redis` o adapter propio) para que el contador se comparta entre instancias.
4. **E** — devolver solo `{ success, message }` o un subconjunto mínimo (`id`, `email`, `role`) en `/auth/verify`.
5. **F** — pasar `PGPASSWORD` como variable de entorno del subproceso (`spawn(cmd, args, { env: { ...process.env, PGPASSWORD: pass } })`) en vez de incrustarla en `--dbname`, y usar un `.pgpass` o, mejor, un rol de BD de solo-backup con credenciales dedicadas y de vida corta.

### 6.8 SSO

Supabase Auth (ya integrado) soporta **OAuth social** (Google, Discord, GitHub) de forma nativa vía `supabase.auth.signInWithOAuth()` sin infraestructura adicional — encaja con el público del proyecto (comunidad gamer/tienda de juegos de mesa, alta probabilidad de tener cuenta Google/Discord). Para el panel administrativo interno (`admin`/`empleado`), si en el futuro se integra con un IdP corporativo, Supabase también soporta **SAML 2.0** en su plan Pro. No se recomienda montar un IdP propio (Keycloak, etc.) mientras Supabase siga siendo el proveedor de identidad — sería duplicar infraestructura sin necesidad clara.

**Implementación sugerida (bajo esfuerzo):**
```ts
// frontend inicia el flujo — backend no cambia, solo documentar el flujo
await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${FRONTEND_URL}/auth/callback` } });
```
El backend actual (`SupabaseValidationTokenService`) ya validaría estos tokens sin cambios, porque Supabase emite el mismo tipo de sesión independientemente del proveedor.

---

## 7. Infraestructura / DevOps

### 7.1 Cuellos de botella de infraestructura

- **Un único proceso Node sin `Dockerfile`** en el repo — no hay forma reproducible de construir la imagen de producción; el deploy actual (si existe) es manual o depende de configuración externa al repo, invisible para el equipo.
- **Pool de conexiones de Prisma sin configurar explícitamente** (`prisma.service.ts:8-11`) — con Supabase (que aplica límites de conexión estrictos según plan), bajo carga concurrente el pool por defecto puede agotarse rápido, especialmente si además se usa Supabase para otras cargas (Storage, Realtime). Configurar `connection_limit` en la connection string o usar PgBouncer (Supabase lo ofrece en modo `transaction`) es obligatorio antes de escalar horizontalmente.
- **Cron jobs acoplados al proceso web** (`@nestjs/schedule` corre dentro del mismo proceso que atiende HTTP) — bajo picos de tráfico, el cron compite por el mismo event loop y las mismas conexiones de BD que las requests de usuarios.

### 7.2 Problemas de disponibilidad

- **Sin health check** (`/health`, `/healthz`) — un orquestador (Kubernetes, ECS, Railway, etc.) no tiene forma estándar de saber si el proceso está realmente sano (conexión a Postgres viva, Supabase alcanzable) más allá de "el puerto responde".
- **Sin readiness vs liveness diferenciados** — si se añade un health check simple, debe distinguir "el proceso arrancó" de "puede atender tráfico" (ej. durante el `$connect()` inicial de Prisma).
- **Cron sin lock distribuido** (§1.6/2.5) es un problema de disponibilidad tanto como de performance: con auto-scaling, cada réplica nueva multiplica los backups/expiraciones concurrentes, y un backup concurrente duplicado puede saturar temporalmente la conexión a BD justo cuando más tráfico hay.

### 7.3 Escalabilidad horizontal/vertical

**Horizontal — bloqueadores actuales:**
1. Throttler en memoria (§6.6.D) — requiere Redis compartido.
2. Cron sin lock — requiere Redis (`SET NX`) o mover a un worker/servicio separado del API (ej. un segundo deployment "worker" con `ScheduleModule` y sin exponer HTTP).
3. Backups a disco local (§Infra 7.4) — el filesystem no es compartido entre réplicas ni persiste en redeploys.

**Vertical:** el único punto de presión vertical identificado es `sharp` en uploads concurrentes (§1.7) — mitigable con límite de concurrencia antes de necesitar más CPU/RAM por instancia.

**Recomendación de topología objetivo:**
```
                    ┌─────────────┐
   Cliente ──────▶  │ Load Balancer│
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         API pod 1    API pod 2    API pod N   (stateless, sin cron)
              │            │            │
              └────────────┼────────────┘
                           ▼
                    ┌─────────────┐
                    │    Redis    │  ← throttler, cache, colas (BullMQ)
                    └─────────────┘
                           │
                    ┌─────────────┐
                    │ Worker pod  │  ← @nestjs/schedule (cron), consumer BullMQ
                    └─────────────┘
                           │
                    ┌─────────────┐
                    │  Postgres   │  ← vía PgBouncer (Supabase pooler)
                    └─────────────┘
```

### 7.4 Observabilidad (logs, metrics, tracing)

- **Logs:** solo `Logger` de Nest a stdout, sin formato estructurado (JSON). En un entorno con agregador de logs (Datadog, CloudWatch, Loki), texto plano dificulta el filtrado y las alertas basadas en campos. Migrar a `nestjs-pino` con formato JSON (`level`, `msg`, `requestId`, `userId`) es bajo esfuerzo y alto retorno.
- **Metrics:** no hay `/metrics` (Prometheus) ni ningún contador de latencia/tasa de error por endpoint expuesto. Sin esto, no hay forma de alertar sobre degradación antes de que un usuario reporte el problema.
- **Tracing:** no hay correlación de request-id entre el guard de auth, el interceptor de logs y las queries de Prisma — un incidente requiere reconstruir el flujo manualmente desde logs sueltos. OpenTelemetry con exporter a cualquier backend (Jaeger, Tempo, Datadog APM) resolvería esto con el instrumentation automático de Nest + Prisma.
- **Backups sin monitoreo:** el cron de backup solo loguea éxito/fallo (`backup.scheduler.ts:20-24`) — si falla silenciosamente durante días (ej. `pg_dump` no instalado en la imagen nueva tras un cambio de infra), nadie se entera hasta necesitar restaurar.

### 7.5 Mejoras de deployment

1. **Dockerfile multi-stage** (build con devDependencies → runtime solo con `dist/` + `node_modules` de producción + Prisma engine):
   ```dockerfile
   FROM node:20-alpine AS build
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npx prisma generate && npm run build

   FROM node:20-alpine AS runtime
   WORKDIR /app
   ENV NODE_ENV=production
   COPY package*.json ./
   RUN npm ci --omit=dev
   COPY --from=build /app/dist ./dist
   COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
   COPY prisma ./prisma
   EXPOSE 3000
   CMD ["node", "dist/main"]
   ```
2. **Extender `.github/workflows/api.yml`** con un job de `deploy` tras `build-and-test` en `main`, y correr `npm run test:e2e` en CI (actualmente configurado pero no ejecutado — falta el `job`/`step`).
3. **`@nestjs/terminus`** para `/health` (liveness) y `/health/ready` (readiness, chequeando `$queryRaw\`SELECT 1\`` contra Postgres).

### 7.6 Caching (Redis, CDN)

- **Redis**: throttler distribuido + caché de rol/dashboard (§2.1) + backend de colas BullMQ — una sola instancia de Redis cubre los 3 casos de uso, bajo costo de infraestructura adicional para el beneficio obtenido.
- **CDN**: las imágenes ya viven en Supabase Storage con URL pública (`upload.service.ts:73-77`) — colocar un CDN (Cloudflare, o el edge cache nativo de Supabase Storage si el plan lo incluye) delante de esas URLs reduce latencia de imágenes para usuarios finales y descarga el bucket de tráfico repetido. No requiere cambios de código, solo de configuración DNS/proxy.

### 7.7 Balanceo de carga

Ninguno de los hallazgos bloquea poner un LB estándar (Nginx, ALB, Cloudflare) delante de N instancias **una vez resueltos** el throttler distribuido y el cron con lock — sin esos dos cambios, escalar horizontalmente con un LB introduce los bugs descritos en §6.6.D y §7.2 en vez de resolver capacidad.

### 7.8 Monitoreo

Stack sugerido, priorizado por esfuerzo/beneficio:
1. `/health` con Terminus (bajo esfuerzo, desbloquea cualquier orquestador).
2. Logs estructurados JSON + agregador (Loki/CloudWatch/Datadog) — bajo esfuerzo, alto beneficio inmediato para debugging.
3. Alertas básicas sobre tasa de error 5xx y latencia P95 por endpoint (una vez haya métricas expuestas).
4. Dashboard de BullMQ (si se adopta colas) para visibilidad de jobs fallidos de logs/backups.

---

## 8. Roadmap priorizado

**Sprint 1 — P0, bajo esfuerzo, alto impacto:**
- Crear los 9 índices de §5.2 (`CREATE INDEX CONCURRENTLY`, migración separada de datos).
- Corregir `pg_dump`/`psql` para no exponer password en `argv` (§6.7.5).
- Paginar + filtrar `deleted_at` en `findAllForAdmin` (§1.2).

**Sprint 2 — P0/P1, seguridad y auth:**
- JWT local (eliminar dependencia de red por request) + caché de rol en Redis (§1.1, §2.1).
- Cerrar escalación de privilegios en `updateAdminUser` y `DELETE /upload` (§6.3, §6.7.1).
- Throttle en `refresh-token` (§6.7.2).

**Sprint 3 — P1, escalabilidad horizontal:**
- Redis para throttler distribuido (§6.7.3).
- Lock distribuido o worker separado para cron (§2.5, §7.3).
- Backups a almacenamiento externo (S3/GCS) + rotación (§7 hallazgo 5).

**Sprint 4 — P1/P2, observabilidad e infra:**
- Dockerfile + `/health` + logs JSON (§7.5, §7.8).
- Caché de dashboard (§1.3, §2.1).
- Colas para logs de auditoría (§1.5, §2.3).

**Backlog — P2, calidad/deuda técnica:**
- Unificar `try/catch` repetido vía exception filter global (§4 Refactor 1).
- Renombrar `aplication/` → `application/`, corregir typos de archivos (§4 code smells 3-5).
- Extraer política de autorización del controller a use-case (§4 Refactor 2).
- Retirar comentarios de andamiaje (§3 Legibilidad).
