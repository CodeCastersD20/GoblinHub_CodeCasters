FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL
ARG VITE_GOOGLE_MAPS_API_KEY=""

RUN test -n "$VITE_API_URL" || (echo "VITE_API_URL build argument is required" >&2; exit 1)
RUN VITE_API_URL="$VITE_API_URL" \
    VITE_GOOGLE_MAPS_API_KEY="$VITE_GOOGLE_MAPS_API_KEY" \
    npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --retries=3 --start-period=10s \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/healthz || exit 1

USER 101

