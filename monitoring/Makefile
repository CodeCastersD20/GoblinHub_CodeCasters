# Makefile del stack de monitoreo (spec 005, §5).
#
# No añade dependencias: usa `docker compose` y `node`. El objetivo `up` genera
# configuración antes de levantar los servicios: esa validación temprana
# evita que Prometheus/Alertmanager fallen a mitad del despliegue.

.DEFAULT_GOAL := help

.PHONY: help config check up up-evidencia reload down logs ps lint test-receivers

help:
	@echo "Stack de monitoreo — GoblinHub"
	@echo ""
	@echo "  make config        Genera prometheus.yml y alertmanager.yml desde .env"
	@echo "  make check         Valida la configuración con promtool/amtool (Docker)"
	@echo "  make up            Levanta Prometheus, Alertmanager, Grafana y node_exporter"
	@echo "  make reload        Aplica cambios de configuración sin recrear el stack"
	@echo "  make up-evidencia  Levanta el stack + receptor webhook de evidencia"
	@echo "  make down          Detiene y borra contenedores (no borra volúmenes)"
	@echo "  make logs          Sigue logs de Prometheus + Alertmanager"
	@echo "  make ps            Estado de los servicios"
	@echo "  make lint          Ejecuta check rules + check config + amtool check-config"
	@echo "  make test-receivers Muestra los receptores renderizados (sin secretos)"

config:
	node scripts/generate-config.mjs

check: config
	@docker run --rm --entrypoint promtool \
		-v "$(CURDIR)/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro" \
		-v "$(CURDIR)/prometheus/rules:/etc/prometheus-rules:ro" \
		prom/prometheus:v3.5.0 check config /etc/prometheus/prometheus.yml
	@docker run --rm --entrypoint promtool \
		-v "$(CURDIR)/prometheus/rules:/etc/prometheus-rules:ro" \
		prom/prometheus:v3.5.0 check rules /etc/prometheus-rules/goblinhub.yml
	@docker run --rm --entrypoint amtool -v "$(CURDIR)/alertmanager:/etc/alertmanager:ro" prom/alertmanager:v0.28.1 check-config /etc/alertmanager/alertmanager.yml

# `--force-recreate` no es opcional: la configuración vive en un volumen, así
# que `docker compose up -d` NO reinicia Prometheus ni Alertmanager cuando
# cambia una plantilla. Sin esto, un cambio de reglas o de umbrales se
# despliega... y no se aplica, mientras la UI sigue enseñando la versión
# anterior. Es el fallo más fácil de no detectar de todo este stack.
up: config
	docker compose --profile evidencia up -d --force-recreate

up-evidencia: config
	docker compose --profile evidencia up -d --force-recreate

# Ruta rápida para iterar sobre plantillas: Prometheus recarga con SIGHUP vía
# la API de life cycle y Alertmanager solo recarga si se reinicia.
reload: config
	docker compose up -d --force-recreate config-init
	docker compose restart alertmanager
	@curl --fail --silent --request POST http://localhost:9090/-/reload \
	&& echo "Prometheus recargado" \
	|| echo "Prometheus no respondio al reload: ejecuta make up"

down:
	docker compose --profile evidencia down --remove-orphans

logs:
	docker compose logs -f prometheus alertmanager grafana

ps:
	docker compose ps

lint: check

# Útil para comprobar qué receptores quedaron en el YAML sin exponer el
# contenido completo (especialmente el webhook).
test-receivers: config
	@echo "Receivers en alertmanager.yml:"
	@sed -n '/^receivers:/,/^$/p' alertmanager/alertmanager.yml
