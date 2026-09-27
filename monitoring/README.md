# Stack de monitoreo — GoblinHub

Implementa el módulo de métricas y el stack de observabilidad de la issue
**#214**. La especificación vive en `specs/005-modulo-metricas-monitoreo/`; el
runbook operativo, en `docs/RUNBOOK_MONITOREO.md`.

## Puesta en marcha

```bash
cd monitoring
cp .env.example .env
$EDITOR .env          # DEPLOY_ENV, API_TARGET, GRAFANA_ADMIN_PASSWORD
make up               # renderiza la configuración y levanta el stack
```

| Servicio | URL local | Qué es |
|---|---|---|
| Grafana | http://localhost:3000 | Tablero «GoblinHub — Métricas y Monitoreo» |
| Prometheus | http://localhost:9090 | Targets, reglas y consultas |
| Alertmanager | http://localhost:9093 | Alertas agrupadas y enrutado |

Comprobar que la API responde antes de culpar al stack:

```bash
curl -s http://localhost:3010/metrics | head        # la API instrumentada
curl -s http://localhost:9090/api/v1/targets         # el scrape funciona
```

## Estructura

```
monitoring/
├── .env.example                  plantilla de configuración (sin secretos)
├── docker-compose.yml            Prometheus, Alertmanager, Grafana, node_exporter
├── Makefile                      up, reload, check, down
├── prometheus/
│   ├── prometheus.yml.template   jobs de scrape y Alertmanager
│   └── rules/goblinhub.yml       reglas A-01..A-14 + recording rules
├── alertmanager/
│   └── alertmanager.yml.template agrupado, inhibición y receptores
├── grafana/
│   ├── provisioning/             datasources y proveedor de dashboards
│   └── dashboards/               el tablero, versionado
├── scripts/
│   ├── generate-config.mjs       renderiza las plantillas desde `.env`
│   └── mock-webhook.mjs          receptor de la evidencia de alerta
└── sql/
    └── create-readonly-role.sql  rol de solo lectura para N-01..N-08
```

## Configuración: por qué hay un generador

Prometheus no interpola variables de entorno en su fichero de configuración, y
la imagen oficial no trae `envsubst`. `scripts/generate-config.mjs` hace esa
sustitución con Node —que el proyecto ya tiene— y añade lo que `envsubst` no
hace: **validar**. Si falta una variable obligatoria, sale con código distinto
de cero y `docker compose up` no arranca nada. Un stack de monitoreo que no
arranca es un incidente; uno que arranca a medias es peor.

Los bloques condicionales de la plantilla de Alertmanager hacen que un receptor
sin canal configurado no llegue al fichero generado: un `slack_configs` con
webhook vacío hace fallar la carga de la configuración de Alertmanager, y ese
fallo solo se descubre cuando el contenedor ya está arrancando.

## `make reload` frente a `make up`

La configuración generada vive en un volumen, no en el repositorio, así que
`docker compose up -d` **no reinicia** Prometheus ni Alertmanager cuando cambia
una plantilla. Sin `--force-recreate`, un cambio de reglas se despliega y no se
aplica mientras la UI sigue enseñando la versión anterior. `make up` recrea
siempre; `make reload` es la ruta rápida (regenera, reinicia Alertmanager y
manda `POST /-/reload` a Prometheus).

## Requisitos

- Docker con Compose v2 (`name:` de nivel superior requiere v2.3.3+).
- Node 20+ para `scripts/generate-config.mjs` (no se ejecuta dentro de Docker
  salvo en el servicio `config-init`).
- La API instrumentada accesible desde los contenedores. En Linux, el
  `docker-compose.yml` declara `host.docker.internal:host-gateway`; sin eso el
  scrape falla con «no such host» y parece una caída de la API.

## Métricas de negocio (N-01..N-08)

La sección de negocio del tablero usa un datasource PostgreSQL de **solo
lectura**. Para activarlo:

```bash
psql "$DATABASE_URL" -v rol=goblinhub_ro -f sql/create-readonly-role.sql
# y en .env: BUSINESS_DB_HOST, BUSINESS_DB_USER, BUSINESS_DB_PASSWORD
```

Sin credenciales, el datasource queda aprovisionado pero sin conexión y los tres
paneles de negocio aparecen vacíos. El resto del tablero funciona igual.

## Verificación

```bash
make check    # promtool check config + check rules + amtool check-config
```

Es el mismo gate que ejecuta CI en `.github/workflows/monitoring.yml`.
