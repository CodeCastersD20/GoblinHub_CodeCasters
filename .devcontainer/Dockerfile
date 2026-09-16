# Imagen base del Codespace de GoblinHub.
# Paridad con el Dockerfile de producción de goblinhub-api/ (node:20-alpine -> node:20).
FROM node:20-bookworm

ENV PRISMA_HIDE_UPDATE_MESSAGE=true \
    DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    build-essential \
    openssl \
    postgresql-client \
    redis-tools \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Copia la configuración global del usuario node (se lee desde el contexto del repo)
COPY .devcontainer/.bashrc /home/node/.bashrc

USER node
WORKDIR /workspaces/GoblinHub_CodeCasters