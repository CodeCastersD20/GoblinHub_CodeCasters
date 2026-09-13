# Propuesta de Spec Driven Development (SDD) y Guía de Herramientas

## 1. Contexto y Decisión: Kiro vs Spec-Kit
Para estandarizar el desarrollo basado en especificaciones en GoblinHub, evaluamos las siguientes herramientas:
* **Kiro:** Ofrece visualización avanzada de trazabilidad, pero añade fricción operativa al requerir gestión en una plataforma externa al código.
* **Spec-Kit (GitHub):** Seleccionada definitivamente por su integración nativa. Permite tratar la infraestructura, las pruebas y los requerimientos como código directamente en el ecosistema de GitHub Actions.

## 2. Guía de Instalación y Configuración (Spec-Kit)
La integración de la filosofía Spec-Kit se configuró mediante las herramientas nativas del repositorio:
1. Definición de etiquetas `[Spec]` y `[Feature]` en los templates de Issues.
2. Vinculación estricta de PRs con sus issues de origen (Trazabilidad).
3. Configuración de *Branch Protections* en `main` y `develop` que exigen la aprobación de los workflows `api.yml` y `web.yml` antes de permitir la fusión de código.

## 3. Módulos Piloto (Frontend e Infraestructura)
* **Piloto A (Pruebas E2E y Flujos UI):** Las 19 pruebas configuradas con Playwright actúan como specs visuales e interactivas, garantizando que el usuario final pueda navegar y consumir la plataforma sin errores.
* **Piloto B (Infraestructura como Código - IaC):** El `Dockerfile`, la configuración de `nginx.conf` y los pipelines CI/CD actúan como especificaciones inmutables del entorno de despliegue, asegurando consistencia entre entornos locales y de producción en Render.