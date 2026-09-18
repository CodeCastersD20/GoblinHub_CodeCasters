# Cambio mínimo al backend: throttling configurable por entorno

## Contexto

El módulo de plan de pruebas de carga con K6 (`perf/179-plan-de-pruebas-de-carga-con-k6-implementación-instalación-y-endpoints`)
requiere poder ejecutar escenarios con más de 5 VUs contra la API de GoblinHub.

GoblinHub aplica un **throttle global de 10 solicitudes por minuto por IP** a través de
`ThrottlerGuard` registrado globalmente en `goblinhub-api/src/app.module.ts`.
Como K6 genera las solicitudes desde una sola máquina/IP, agota ese límite al cabo de
pocos segundos y el API responde `429 Too Many Requests`, lo que distorsiona la medición
del rendimiento real (p95) que pretende validar el SLA `p95 < 5 segundos`.

Para no desactivar una protección del sistema en producción, se realizó el **cambio mínimo
aprobado por el equipo**: el límite y la ventana del throttler ahora son configurables mediante
variables de entorno, manteniendo el comportamiento actual por defecto.

## Cambio realizado

### `goblinhub-api/src/app.module.ts`

Antes (hardcodeado):

```ts
ThrottlerModule.forRoot([
  {
    ttl: 60000,
    limit: 10,
  },
]),
```

Después (configurable por entorno):

```ts
ThrottlerModule.forRoot([
  {
    ttl: Number(process.env.THROTTLE_TTL ?? 60000),
    limit: Number(process.env.THROTTLE_LIMIT ?? 10),
  },
]),
```

### `goblinhub-api/.env.example`

Se documentaron las nuevas variables:

```dotenv
THROTTLE_TTL=60000
THROTTLE_LIMIT=10
```

## Impacto

- **Sin variables definidas**: comportamiento idéntico al anterior (10 req/min por IP). No hay
  regresión de seguridad en el default.
- Con `THROTTLE_LIMIT` alto (p. ej. `10000`): el throttler global prácticamente no limita,
  permitiendo pruebas de carga reales contra una instancia de prueba.
- No se modifica el throttling específico de las rutas de `auth` (`signin`, `signup`,
  `refresh-token`, etc.), que conservan sus límites propios mediante `@Throttle`.

## Cómo habilitar el modo pruebas de carga

1. Crear/editar el `.env` del backend (`goblinhub-api/.env`) con:

   ```dotenv
   THROTTLE_TTL=60000
   THROTTLE_LIMIT=10000
   ```

2. Reiniciar el API (`npm run start:dev`).

> ⚠️ Usar un límite alto **únicamente** en ambientes de desarrollo/testing, no en producción.

## Referencias

- Plan completo de pruebas de carga: [`k6/PLAN_K6.md`](../k6/PLAN_K6.md).
- Workflow manual de CI: [`.github/workflows/k6.yml`](../.github/workflows/k6.yml).