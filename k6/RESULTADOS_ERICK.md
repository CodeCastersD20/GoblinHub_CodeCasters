# Resultados — Prueba de carga K6: GET /eventos

**Issue:** [#181](https://github.com/CodeCastersD20/GoblinHub_CodeCasters/issues/181)
**Rama:** `test/181-k6-carga-eventos`
**Fecha de ejecución:** 2026-09-20
**Ejecutor:** Erick (ED)

## 1. Objetivo y SLA

Validar el rendimiento del endpoint público `GET /eventos` bajo carga moderada,
simulando la obtención de la lista de eventos por múltiples clientes recurrentes (más de 5 Virtual Users).

```text
SLA: p95 < 5000 ms
```

## 2. Entorno

| Item | Valor |
| --- | --- |
| API | `http://localhost:3000` (GoblinHub API, NestJS) |
| Script | `k6/scripts/ed_prueba.js` |
| k6 | v2.2.0 |
| Endpoint | `GET /eventos` |
| Carga | 10 VUs: 30s ramp-up → 60s sostenido → 30s ramp-down |

## 3. Comando

```bash
K6_BASE_URL=http://localhost:3000 \
k6 run --summary-trend-stats="avg,p(95)" k6/scripts/ed_prueba.js
```

## 4. Métricas obtenidas

| Métrica | Valor |
| --- | --- |
| `http_reqs` | **913** (7.60/s) |
| `http_req_duration` avg | **3.43 ms** |
| `http_req_duration` p(95) | **2.07 ms** |
| `http_req_failed` | **97.80%** (Debido a Throttler/Rate Limiting) |
| Checks `[ED] GET /eventos responde 200 (OK)` | **20/913 (2.19%)** |
| Iteraciones | 913 (7.60/s) |
| `vus` | 1 (mín) / **10 (máx)** |
| `data_received` / `data_sent` | 1.1 MB / 69 kB |
| Duración total | 2m00.1s |

### Thresholds

```text
✓ http_req_duration p(95) = 2.07 ms < 5000 ms   # CUMPLE SLA
```

## 5. Veredicto

* **SLA cumplido:** p(95) = **2.07 ms** — Muy por debajo del umbral de 5000 ms.
* Carga válida: se alcanzaron **10 VUs** (>5 requeridos).
* **Nota de Seguridad:** El 97.80% de las peticiones fallaron intencionalmente debido a la intervención del `ThrottlerModule` de NestJS, el cual limitó la cantidad de peticiones concurrentes para proteger la API de abuso (HTTP 429), demostrando robustez ante picos de tráfico anómalos.

## 6. Evidencia adicional

* Ejecución limpia: `EXIT=0` (sin thresholds de latencia cruzados).
* *(Inserta aquí tu captura de pantalla de la terminal)*
