# Resultados — Prueba de carga K6: POST /auth/signin (bad path)

**Issue:** [#183](https://github.com/CodeCastersD20/GoblinHub_CodeCasters/issues/183)
**Rama:** `test/183-test-ejecución-de-prueba-de-carga-k6-post-auth-login`
**Fecha de ejecución:** 2026-09-18
**Ejecutor:** Sadrach Juan Diego Garcia Flores (Sdrx)

## 1. Objetivo y SLA

Validar el rendimiento del endpoint de login en su **bad path** (credenciales inválidas)
bajo carga, con más de 5 Virtual Users.

```text
SLA: p95 < 5000 ms
```

El bad path de `POST /auth/signin` responde `400 Bad Request` con el mensaje
`"Correo o contraseña incorrectos"` (verificado previamente con `curl`).

## 2. Entorno

| Item | Valor |
| --- | --- |
| API | `http://localhost:3000` (GoblinHub API, NestJS) |
| Script | `k6/scripts/as_prueba.js` |
| k6 | v2.2.0 (linux/amd64) |
| Endpoint | `POST /auth/signin` (bad path) |
| Carga | 10 VUs: 30s ramp-up → 60s sostenido → 30s ramp-down |
| Throttling del ambiente de prueba | `THROTTLE_LIMIT=10000`, `AUTH_SIGNIN_THROTTLE_LIMIT=10000`, `AUTH_SIGNIN_THROTTLE_TTL=60000` |

> El throttle específico de `signin` se hizo configurable por entorno
> (`AUTH_SIGNIN_THROTTLE_LIMIT`/`AUTH_SIGNIN_THROTTLE_TTL`) con el mismo default de
> producción (5 req / 90 s), replica del cambio aprobado para el throttling global.

## 3. Comando

```bash
K6_BASE_URL=http://localhost:3000 \
k6 run --summary-trend-stats="avg,p(95)" k6/scripts/as_prueba.js
```

## 4. Métricas obtenidas

| Métrica | Valor |
| --- | --- |
| `http_reqs` | **849** (7.04/s) |
| `http_req_duration` avg | **85.5 ms** |
| `http_req_duration` p(95) | **109.52 ms** |
| `http_req_failed` | 100% (esperado: bad path) |
| Checks `[AS] POST /auth/signin bad path responde 400` | **849/849 (100%)** |
| Iteraciones | 849 (7.04/s) |
| `vus` | 1 (mín) / **10 (máx)** |
| `data_received` / `data_sent` | 1.1 MB / 174 kB |
| Duración total | 2m00.5s |

### Thresholds

```text
✓ http_req_duration p(95) = 109.52 ms < 5000 ms   # CUMPLE SLA
```

## 5. Veredicto

- **SLA cumplido:** p(95) = **109.52 ms** — muy por debajo del umbral de 5 s.
- Carga válida: se alcanzaron **10 VUs** (>5 requeridos).
- Todos los checks esperados pasaron (bad path devuelve 400).
- Nota: `http_req_failed` al 100% es el **comportamiento esperado** de una prueba de bad
  path (todas las respuestas son 4xx); por eso el script no define threshold sobre esa
  métrica y deja como gate único el SLA `p(95)<5000`.

## 6. Evidencia adicional

- Ejecución limpia: `EXIT=0` (sin thresholds cruzados).
- Puede reproducirse en CI vía el workflow manual `.github/workflows/k6.yml`
  (`workflow_dispatch`, matrix `AS` → `k6/scripts/as_prueba.js`).