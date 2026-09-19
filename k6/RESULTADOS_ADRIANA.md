# Resultados de prueba de carga K6 — GET / (página de inicio)

## Información general

| Campo | Valor |
| --- | --- |
| Integrante | Adriana (`AM`) |
| Issue | #182 — Ejecución de prueba de carga K6 — GET / (página de inicio) |
| Script | `k6/scripts/am_prueba.js` |
| Endpoint bajo prueba | `GET /` |
| Método | GET |
| Requiere auth | No |
| Herramienta | k6 v2.2.0 |
| Fecha de ejecución | 19/09/2026 |
| Objetivo de SLA | `p95 < 5s` |

## Configuración del escenario

```javascript
export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],
  },
};
```

- Hasta **10 VUs** (más de 5, según requisito de la tarea).
- Duración total del escenario de carga: **2m** (más 30s de graceful stop).
- `sleep(1)` entre iteraciones.
- `GET /` con `redirects: 0`: el backend responde `302` (redirect a `http://localhost:5173`),
  por lo que se mide la latencia del propio redirect sin seguir al frontend.

## Precondiciones del ambiente

1. API corriendo en `http://localhost:3000`.
2. Sin cambios de configuración adicionales: `GET /` se sirve a nivel de servidor Express
   (antes del router Nest), por lo que no se vieron respuestas `429` del throttle en esta prueba.

## Ejecución

```bash
k6 run k6/scripts/am_prueba.js
```

## Resultados

### Thresholds (SLA)

| Threshold | Valor umbral | Resultado | ¿Cumple? |
| --- | --- | --- | --- |
| `http_req_duration` | `p(95) < 5000ms` | **3.08ms** | ✅ Sí |

### Métricas HTTP

| Métrica | Valor |
| --- | --- |
| `http_reqs` | 918 (7.61 req/s) |
| `http_req_duration` avg | 2.24ms |
| `http_req_duration` min | 0s |
| `http_req_duration` med | 1.30ms |
| `http_req_duration` max | 207.28ms |
| `http_req_duration` p(90) | 2.32ms |
| `http_req_duration` p(95) | **3.08ms** |
| `http_req_failed` | 0.00% (0/918) |
| `data_received` | 1.0 MB (8.7 kB/s) |
| `data_sent` | 64 kB (533 B/s) |

### Checks y ejecución

| Métrica | Valor |
| --- | --- |
| `checks` | 918/918 correctos (100.00%) |
| `iterations` | 918 |
| `vus` | hasta 10 (max 10) |
| `iteration_duration` | avg 1s |

### Captura de la ejecución

```text
█ THRESHOLDS

  http_req_duration
  ✓ 'p(95)<5000' p(95)=3.08ms


█ TOTAL RESULTS

  checks_total.......: 918     7.61232/s
  checks_succeeded...: 100.00% 918 out of 918
  checks_failed......: 0.00%   0 out of 918

  ✓ [AM] GET / responde 302 (redirect a frontend)

  HTTP
  http_req_duration..............: avg=2.24ms min=0s med=1.3ms max=207.28ms p(90)=2.32ms p(95)=3.08ms
    { expected_response:true }...: avg=2.24ms min=0s med=1.3ms max=207.28ms p(90)=2.32ms p(95)=3.08ms
  http_req_failed................: 0.00%  0 out of 918
  http_reqs......................: 918    7.61232/s

  EXECUTION
  iteration_duration.............: avg=1s min=1s med=1s max=1.2s p(90)=1s p(95)=1s
  iterations.....................: 918    7.61232/s
  vus............................: 1      min=1        max=10
  vus_max........................: 10     min=10       max=10

  NETWORK
  data_received..................: 1.0 MB 8.7 kB/s
  data_sent......................: 64 kB  533 B/s
```

## Conclusión

- El endpoint `GET /` **cumple el SLA** `p95 < 5s`: el p95 medido fue de **3.08ms**, más de
  **1600× por debajo** del límite.
- **0% de solicitudes fallidas** y 100% de checks correctos (respuesta `302` en todas las
  iteraciones).
- Rendimiento estable durante la meseta de 10 VUs: p90/p95 muy cercanos a la mediana
  (2.32ms / 3.08ms vs 1.30ms), indicando baja variabilidad.

## Observaciones

- El endpoint `GET /` del backend responde `302` redirigiendo a `http://localhost:5173`
  (frontend). Para medir únicamente la latencia del backend se usó `redirects: 0` en la
  petición (en k6 v2.x la opción por request es `redirects`, no `maxRedirects`).
- El `check` usa el tag propio del integrante: `[AM] GET / responde 302 (redirect a frontend)`.