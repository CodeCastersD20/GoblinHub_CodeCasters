# Plan de pruebas de carga con K6 — GoblinHub

## 4.1 Objetivo

Evaluar el rendimiento del backend de GoblinHub bajo carga y verificar el SLA:

```text
p95 < 5 segundos
```

Cada integrante ejecuta una prueba distinta sobre un endpoint real y frecuentemente utilizado de la
API, con **más de 5 VUs**, midiendo tiempos de respuesta y validando el percentil 95 (p95) de la
duración de las solicitudes HTTP.

## 4.2 Herramienta seleccionada

Se evaluaron tres herramientas:

| Herramienta | Ventajas | Desventajas |
| --- | --- | --- |
| **K6** | Scripting en JavaScript, métricas integradas, thresholds declarativos, fácil salida para CI/CD, mantenible y portable | Requiere instalación local |
| **JMeter** | Ampliamente conocida, GUI | Scripting XML/Java más complejo, conservación de scripts menos legible, curva de aprendizaje mayor, más pesada para CI |
| **Apache Benchmark (`ab`)** | Muy simple, sin instalación extra | Sin métricas percentiladas por defecto, sin thresholds/checks, no simula escenarios complejos ni es mantenible |

**Se selecciona K6** por:

- **Facilidad de scripting**: los escenarios se escriben como JavaScript plano.
- **Métricas**: métricas integradas de tiempo de respuesta, percentiles (p95), tasa de errores, etc.
- **Thresholds**: permite declarar el SLA como umbral automático (`p(95)<5000`) y fallar la prueba si no se cumple.
- **Facilidad de ejecución**: un solo binario y un comando (`k6 run script.js`).
- **Integración con CI/CD**: salida en texto/JSON y compatibilidad con GitHub Actions (adecuada para un workflow manual).
- **Mantenimiento de scripts**: archivos pequeños, legibles y versionables en el repositorio.

## 4.3 Integrantes

| Integrante | Script |
| --- | --- |
| Adrian Eduardo Santos Rosales | `aesr_prueba.js` |
| Erick Daniel Arvayo Aviles | `edaa_prueba.js` |
| Jesus Adrian Martinez Trillas | `jamt_prueba.js` |
| Sadrach Juan Diego Garcia Flores | `sjdf_prueba.js` |

## 4.4 Instalación de K6

### Linux (Debian/Ubuntu, vía `apt`)

```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/grafana.gpg \
  --keyserver keyserver.ubuntu.com --recv-keys 0x4B8EC3B1A2D4C3F9
echo "deb [signed-by=/usr/share/keyrings/grafana.gpg] https://apt.grafana.com stable main" \
  | sudo tee /etc/apt/sources.list.d/grafana.list
sudo apt-get update
sudo apt-get install -y k6
```

Verificar con:

```bash
k6 version
```

### macOS (Homebrew)

```bash
brew install k6
```

### Windows (releases/binarios oficiales)

1. Descargar el binario `.zip` (para Windows `amd64`) desde los releases oficiales de Grafana k6:
   <https://github.com/grafana/k6/releases>
2. Extraer `k6.exe`.
3. Agregar la carpeta con `k6.exe` al `PATH` (o ejecutarlo directamente).
4. Verificar:

   ```powershell
   k6 version
   ```

Alternativa con `winget` (si está disponible):

```powershell
winget install k6
```

## 4.5 Ejecución

Cada integrante ejecuta su propio script de forma independiente:

```bash
k6 run k6/scripts/aesr_prueba.js
k6 run k6/scripts/edaa_prueba.js
k6 run k6/scripts/jamt_prueba.js
k6 run k6/scripts/sjdf_prueba.js
```

### Variables de entorno

| Variable | Descripción | Default | Usada en |
| --- | --- | --- | --- |
| `K6_BASE_URL` | URL base de la API contra la que se prueba | `http://localhost:3000` | Todos los scripts |
| `K6_TOKEN` | Token JWT (`access_token`) para endpoints autenticados | *(requerido, sin default)* | `sjdf_prueba.js` |

Ejemplos:

```bash
K6_BASE_URL=http://localhost:3000 k6 run k6/scripts/aesr_prueba.js

K6_BASE_URL=http://localhost:3000 \
K6_TOKEN=<access_token_obtenido_por_signin> \
k6 run k6/scripts/sjdf_prueba.js
```

### Precondiciones del ambiente

1. **API levantada**: el backend debe estar corriendo (default en `http://localhost:3000`).
2. **Throttler relajado** (solo ambiente de pruebas): en el `.env` del backend configurar
   `THROTTLE_LIMIT=10000` y reiniciar. Ver [`docs/K6_CAMBIO_THROTTLE.md`](../docs/K6_CAMBIO_THROTTLE.md).
3. **Datos sembrados**: `GET /events`, `GET /productos` y `GET /rewards` responden `404` si la base
   de datos está vacía. Es necesario contar con al menos un evento, producto y recompensa activos.
4. **Redis activo** (necesario para `/auth/me` y cualquier endpoint autenticado): el guard
   `SupabaseAuthGuard` consulta la caché de roles en Redis.

## 4.6 Endpoints bajo prueba

| Integrante | Script | Endpoint | Método | Requiere auth |
| --- | --- | --- | --- | --- |
| Adrian Eduardo Santos Rosales | `aesr_prueba.js` | `/events` | GET | No |
| Erick Daniel Arvayo Aviles | `edaa_prueba.js` | `/productos` | GET | No |
| Jesus Adrian Martinez Trillas | `jamt_prueba.js` | `/rewards` | GET | No |
| Sadrach Juan Diego Garcia Flores | `sjdf_prueba.js` | `/auth/me` | GET | Sí (Bearer JWT) |

Se seleccionaron endpoints de lectura frecuentes que:

- son consumidos por el frontend en múltiples vistas (Home, catálogo de productos, eventos, recompensas);
- representan operaciones importantes del backend (listado con lógica de negocio y consultas a BD);
- no son administrativos ni destructivos;
- permiten medir correctamente el rendimiento de la API.

`/auth/me` cubre además el recorrido completo de autenticación (validación JWT contra Supabase, caché en
Redis y consulta de perfil), representativo del uso real.

## 4.7 Autenticación

El backend autentica con **JWT de Supabase** (`Authorization: Bearer <token>`), validado por el guard
`SupabaseAuthGuard`. El token NO se hardcodea en los scripts: se inyecta vía variable de entorno
`K6_TOKEN`.

Cómo obtener un `access_token` de prueba:

```bash
curl -X POST http://localhost:3000/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario.prueba@example.com","password":"Password1"}'
```

La respuesta es `{ "access_token": "…", "refresh_token": "…" }`. Se exporta así:

```bash
export K6_TOKEN=<access_token>
```

> Nota: las rutas de `auth` conservan su propio throttling específico (`signin`: 5 req / 90 s), por lo
> que la obtención del token es una única llamada previa a la prueba, no parte de la carga.

## 4.8 Datos de prueba

Las pruebas solo ejecutan **operaciones de lectura (GET)**:

- no eliminan ni modifican datos;
- no crean registros;
- no ejecutan operaciones irreversibles.

Única excepción indirecta: hacer `signin` para obtener el token genera una sola fila de log de login
(comportamiento normal del API). El interceptor de logs (`ActivityLogInterceptor`) solo persiste
solicitudes mutantes (POST/PUT/PATCH/DELETE), por lo que la carga pura de GETs no inunda la tabla de logs.

Precondición documentada: la BD debe tener datos (ver sección 4.5).

## 4.9 Configuración de los scripts

Todos los scripts comparten una misma estructura (adaptada al endpoint de cada integrante):

- `options` con `stages` (carga > 5 VUs) y `thresholds`.
- `check()` sobre el código de estado esperado (`200`).
- `sleep(1)` entre iteraciones para no generar una carga innecesariamente agresiva.
- Lectura de `K6_BASE_URL` desde el entorno.

Configuración de carga (por script):

```javascript
export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.05'],
  },
};
```

El threshold principal (SLA):

```javascript
http_req_duration: ['p(95)<5000'],
```

## 4.10 CI/CD

Workflow manual (opcional, no bloquea commits/PRs): [`.github/workflows/k6.yml`](../.github/workflows/k6.yml).
Se dispara con `workflow_dispatch` y ejecuta los 4 scripts vía matrix. Las cargas de K6 no se añaden a
Husky/pre-commit (no existe Husky en el repo y añadir carga pesada al desarrollo lo ralentizaría sin beneficio).

## 4.11 Throttling global de la API

`ThrottlerGuard` limita globalmente a 10 req/min por IP. K6 desde una sola máquina agotaría ese límite
y recibiría `429`, distorsionando el p95. Para medir rendimiento real se requiere relajar el límite en el
ambiente de pruebas con `THROTTLE_LIMIT=10000` (ver [`docs/K6_CAMBIO_THROTTLE.md`](../docs/K6_CAMBIO_THROTTLE.md)).
Esto fue un cambio mínimo aprobado por el equipo; el default del API no cambia.