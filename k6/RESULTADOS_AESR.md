# Resultados de prueba de carga K6 — GET /productos

## Información general

| Campo | Valor |
| --- | --- |
| Integrante | Adrian Eduardo Santos Rosales (`AESR`) |
| Issue | #180 — Ejecución de prueba de carga K6 — GET /productos |
| Script | `k6/scripts/aesr_prueba.js` |
| Endpoint bajo prueba | `GET /productos` |
| Método | GET |
| Requiere auth | No |
| Herramienta | k6 v2.1.0 |
| Fecha de ejecución | 18/09/2026 |
| Objetivo de SLA | `p95 < 5s` |

## Configuración del escenario

```javascript
stages: [
  { duration: '30s', target: 10 },
  { duration: '1m', target: 10 },
  { duration: '30s', target: 0 },
],
thresholds: {
  http_req_duration: ['p(95)<5000'],
  http_req_failed: ['rate<0.05'],
},
```

- Hasta **10 VUs** (más de 5, según requisito de la tarea).
- Duración total del escenario de carga: **2m** (más 30s de graceful stop).
- `sleep(1)` entre iteraciones.

## Precondiciones del ambiente

1. API corriendo en `http://localhost:3000`.
2. Throttler global relajado para pruebas de carga: `THROTTLE_LIMIT=10000` en
   `goblinhub-api/.env` (ver [`docs/K6_CAMBIO_THROTTLE.md`](../docs/K6_CAMBIO_THROTTLE.md)).
   Con el límite por defecto (`10 req/min` por IP) el API devuelve `429 Too Many Requests` y
   distorsiona el p95.
3. Base de datos con productos activos sembrados (GET `/productos` responde `200`).

## Ejecución

```bash
k6 run k6/scripts/aesr_prueba.js
```

## Resultados

### Thresholds (SLA)

| Threshold | Valor umbral | Resultado | ¿Cumple? |
| --- | --- | --- | --- |
| `http_req_duration` | `p(95) < 5000ms` | **51.59ms** | ✅ Sí |
| `http_req_failed` | `rate < 0.05` | **0.00%** | ✅ Sí |

### Métricas HTTP

| Métrica | Valor |
| --- | --- |
| `http_reqs` | 878 (7.28 req/s) |
| `http_req_duration` avg | 47.95ms |
| `http_req_duration` min | 44.15ms |
| `http_req_duration` med | 45.94ms |
| `http_req_duration` max | 381.66ms |
| `http_req_duration` p(90) | 48.62ms |
| `http_req_duration` p(95) | **51.59ms** |
| `http_req_failed` | 0.00% (0/878) |
| `data_received` | 1.5 MB (12 kB/s) |

### Checks y ejecución

| Métrica | Valor |
| --- | --- |
| `checks` | 878/878 correctos (100.00%) |
| `iterations` | 878 |
| `vus` | min 10 / max 10 |
| `iteration_duration` | avg 1.04s |

## Conclusión

- El endpoint `GET /productos` **cumple el SLA** `p95 < 5s`: el p95 medido fue de **51.59ms**,
  más de **95× por debajo** del límite.
- **0% de solicitudes fallidas** y 100% de checks correctos (respuesta `200` en todas las
  iteraciones).
- El rendimiento es estable durante la meseta de carga sostenida (10 VUs por 1 minuto), con un
  p90/p95 muy cercanos a la mediana (48.62ms / 51.59ms vs 45.94ms), indicando baja variabilidad.

## Observaciones

- Primera ejecución realizada antes de relajar el throttler: `http_req_failed` mostró **97.81%**
  porque el `ThrottlerGuard` global respondía `429` tras las primeras 10 peticiones/min, no por un
  problema de rendimiento. Tras fijar `THROTTLE_LIMIT=10000` y reiniciar la API, la prueba completa
  terminó con 0% de errores y el p95 obtenido refleja el rendimiento real del endpoint.
- El `check` usa el tag propio del integrante: `[AESR] GET /productos responde 200`.