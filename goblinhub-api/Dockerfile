# syntax=docker/dockerfile:1
#
# Imagen de la API de GoblinHub.
#
# Existe porque `infra/terraform/main.tf` declara el servicio de Render con
# `runtime = "docker"` y `docker_context = "goblinhub-api"`: sin este fichero
# el despliegue declarativo no tenía imagen que construir, y sin despliegue no
# había `/metrics` que Prometheus pudiera sondear en el entorno de producción
# (spec 005, US2).
#
# Requisitos que impone el alcance de #214:
#   - `postgresql-client`: `BackupService` ejecuta `pg_dump` para el respaldo
#     diario. Sin él en la imagen, el cron falla siempre y la alerta A-07
#     (respaldo atrasado) dispararía por una causa que no es un incidente.
#   - `curl`: lo usan el `HEALTHCHECK` y `scripts/deploy/healthcheck.sh`.

# ──────────────────────────────── construcción ────────────────────────────────
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Primero los manifiestos: mientras no cambien, la capa de dependencias se
# reutiliza y los despliegues no reinstalan 400 paquetes.
COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json tsconfig.build.json nest-cli.json ./
RUN npx prisma generate

COPY src ./src
RUN npm run build

# ─────────────────────────────── dependencias ───────────────────────────────
# Stage aparte para no arrastrar el toolchain de desarrollo a la imagen final.
FROM node:22-bookworm-slim AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ───────────────────────────────── ejecución ─────────────────────────────────
FROM node:22-bookworm-slim AS runtime

# `postgresql-client` aporta pg_dump/pg_restore; `curl` aporta el HEALTHCHECK.
RUN apt-get update \
  && apt-get install --no-install-recommends -y postgresql-client curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# El contenedor no corre como root: un incidente de escalada no debe heredar
# privilegios del proceso que Prometheus vigila.
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs goblinhub

COPY --from=deps --chown=goblinhub:nodejs /app/node_modules ./node_modules
# El cliente generado por Prisma vive en node_modules/.prisma y no lo reinstala
# `npm ci --omit=dev`, así que se copia desde la etapa de construcción.
COPY --from=builder --chown=goblinhub:nodejs /app/node_modules/.prisma \
  ./node_modules/.prisma
COPY --from=builder --chown=goblinhub:nodejs /app/dist ./dist
COPY --chown=goblinhub:nodejs prisma ./prisma
COPY --chown=goblinhub:nodejs scripts ./scripts
COPY --chown=goblinhub:nodejs package.json ./

# `backups/` es el destino de `BackupService` (SLA S6, RPO 24 h). Se crea con
# el usuario del servicio para que el cron pueda escribir sin `chmod` en cada
# despliegue.
RUN mkdir -p /app/backups && chown goblinhub:nodejs /app/backups

USER goblinhub

EXPOSE 3000

# La misma ruta que consulta `health_check_path` en `infra/terraform/main.tf`.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl --fail --silent http://127.0.0.1:${PORT}/healthz || exit 1

CMD ["node", "dist/main.js"]
