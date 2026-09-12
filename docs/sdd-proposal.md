# Propuesta de Spec Driven Development (SDD) y Guía de Herramientas

## 1. Contexto y Decisión: Kiro vs Spec-Kit
Para estandarizar el desarrollo basado en especificaciones en GoblinHub, evaluamos las siguientes herramientas:
* **Kiro:** Ofrece visualización avanzada de trazabilidad, pero añade fricción operativa al requerir gestión en una plataforma externa al código.
* **Spec-Kit (GitHub):** Seleccionada definitivamente por su integración nativa. Permite tratar la infraestructura, las pruebas y los requerimientos como código directamente en el ecosistema de GitHub Actions.

## 2. Guía de Instalación y Configuración (Spec-Kit)
La integración de la filosofía Spec-Kit se configuró mediante las herramientas nativas del repositorio:
1. Definición de etiquetas `[Spec]` y `[Feature]` en los templates de Issues.
