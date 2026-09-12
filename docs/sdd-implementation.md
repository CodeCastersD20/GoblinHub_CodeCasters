# Implementación de Spec Driven Development (SDD) en GoblinHub

## 1. Definición y Beneficios Core
En GoblinHub, implementamos Spec Driven Development (SDD) para que los requerimientos del negocio dicten directamente el código y su validación.
* **Beneficios:** Eliminamos la documentación obsoleta, reducimos la deuda técnica y garantizamos que ninguna regla de negocio se rompa en producción gracias a la validación automatizada en el CI/CD.

## 2. Implementación Técnica y Módulos Piloto (QA & Backend)
* **Piloto A (Pruebas E2E):** Implementación de Playwright. Las 19 pruebas actuales fungen como *specs* visuales y de flujo de usuario, validando la UI sin intervención manual.
* **Piloto C (Contratos Backend):** Los *specs* de la API (RBAC, Eventos, Productos) están codificados como pruebas de Jest. El backend debe cumplir con estas respuestas y estructuras para pasar los pipelines.
* **Piloto D (Módulo Adicional - Caché):** Especificación ejecutable de seguridad y rendimiento, donde la validación síncrona de JWT y los roles en Redis dictan los permisos del sistema.

## 3. Seguimiento y Herramientas (Flujo Spec-Kit)
Para el seguimiento de SDD, integramos la filosofía de Spec-Kit apoyándonos en el ecosistema nativo de GitHub, descartando herramientas de terceros que añaden fricción.
* **Trazabilidad:** Los requerimientos técnicos nacen como Issues, se etiquetan y se enlazan semánticamente a los Pull Requests.
* **Integración Continua:** Los flujos de `api.yml` y `web.yml` son la barrera que asegura que el código cumpla con los *specs* antes de cualquier despliegue.

## 4. Implementación Técnica (Infraestructura como Codigo)
* **Piloto B (Infraestructura y Despliegue):** Los archivos `Dockerfile` y `nginx.conf` se tratan como las especificaciones inmutables del entorno. Estos archivos documentan y ejecutan las reglas de empaquetado, enrutamiento del frontend y validación de salud (`HEALTHCHECK`) para el despliegue automático en Render.