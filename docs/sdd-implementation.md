# Implementación de Spec Driven Development (SDD) en GoblinHub

> **Entregable de la Actividad 1.1** — guía completa de SDD, beneficios, seguimiento
> y herramienta de soporte (Spec Kit / `specify`).
> Vinculado a la liga de apoyo **d)**:
> <https://github.com/github/spec-kit> · <https://scrummanager.com/community/spec-driven-development-qu-es-de-dnde-viene-y-por-qu-importa>

---

## 1. Definición y beneficios core

En GoblinHub implementamos **Spec-Driven Development (SDD)**: los requerimientos
del negocio se escriben primero como *specs* ejecutables y validables, y el código
(y sus pruebas) se implementa para cumplirlos. La spec es la fuente de verdad; el
código es la implementación; las pruebas automatizadas son la verificación.

**Beneficios observados:**

- **Eliminación de la documentación obsoleta**: la spec describe *qué* y las
  pruebas validan el *cómo* continuamente.
- **Reducción de deuda técnica**: al especificar antes de codificar se evitan
  capas sin propósito.
- **Trazabilidad issue → spec → plan → tasks → PR → prueba**: cada decisión queda
  rastreable desde el negocio hasta el commit.
- **Barrera de regresión en CI/CD**: las pipelines (`api.yml`, `web.yml`) validan
  que ninguna regla de negocio se rompa en producción.
- **Onboarding**: un nuevo integrante lee `specs/` y sabe qué se prometió y cómo
  se verifica, sin depender de memoria tribal.

## 2. Flujo de trabajo SDD (ciclo completo)

```text
Constitution (principios) ──► /speckit.specify (REQUIREMENTS) ──► /speckit.plan (DESIGN)
      │                                     ▲                              │
      │                                     │                              ▼
      └────────── Determinación de contexto  └────────── /speckit.tasks (WORK BREAKDOWN)
                                                                           │
                                                                           ▼
                                       Converged ◄── /speckit.converge ── /speckit.implement (CODE)
```

| Paso | Comando Spec Kit | Salida |
|---|---|---|
| Crear/ratificar principios | `/speckit.constitution` | `.specify/memory/constitution.md` |
| Definir qué construir | `/speckit.specify` | `specs/NNN-*/spec.md` |
| Aclarar requisitos vagos | `/speckit.clarify` | notas de clarificación |
| Plan técnico con el stack | `/speckit.plan` | `specs/NNN-*/plan.md` |
| Tareas accionables | `/speckit.tasks` | `specs/NNN-*/tasks.md` |
| Implementar | `/speckit.implement` | código + pruebas |
| Verificar convergencia | `/speckit.converge` | reporte Converged/pendiente |

> **Qué comandos correr** (los usamos en este entregable):
>
> ```bash
> /speckit.specify <descripción de la feature>
> /speckit.plan    <descripción de la feature>
> /speckit.tasks   <descripción de la feature>
> /speckit.implement <descripción de la feature>
> /speckit.converge
> ```
>
> CLI (alternativa headless): `specify --version`, `specify check`,
> `specify workflow run speckit --input '{"spec": "..."}'`.

## 3. Implementación técnica y módulos piloto

### Piloto A (Pruebas E2E — liga a)
Las **19 pruebas de Playwright** funcionan como *specs* visuales y de flujo de
usuario. El job global listener valida la UI real sin intervención manual.
Espec: `specs/001-pruebas-automatizadas-e2e-playwright/`.

### Piloto B (Guía interactiva — driver.js — liga b)
El componente `GuideTour` (driver.js) se define como spec de onboarding.
Espec: `specs/002-tour-guiado-interactivo-driverjs/`.

### Piloto C (Contratos de API)
Los *specs* de la API (RBAC, Eventos, Productos) están codificados como pruebas
de **Jest/Supertest**; el backend debe cumplir esas respuestas y estructuras para
pasar los pipelines.

### Piloto D (Infraestructura como Código — Codespaces + Terraform — liga c)
`Dockerfile`, `.devcontainer/` e `infra/terraform/` se tratan como
especificaciones inmutables del entorno y el despliegue. Espec:
`specs/003-infraestructura-codigo-codespaces-terraform/`.

### Piloto E (Módulo AU — Playwright MCP + IA)
Skill `e2e-ia` de opencode que automatiza la generación y ejecución de pruebas
E2E desde una spec. Ver `feat/168-playwright-mcp-ia-skill`.

## 4. Seguimiento y herramientas (flujo Spec-Kit)

- **Instalación**: `GUIA_INSTALACION_SPEC_KIT.md` (uv/pipx + `specify init` +
  comandos `speckit.*`).
- **Trazabilidad**: los requerimientos nacen como issues, se etiquetan, y los
  PRs los cierran con `Closes #id`.
- **Integración continua**: `api.yml` y `web.yml` son la barrera que asegura que
  el código cumple los specs antes de cualquier despliegue.

## 5. Resultados de seguimiento en el repo

| Artefacto | Ubicación |
|---|---|
| Ing. inversa + ER (Mermaid) + trazabilidad | `docs/INGENIERIA_INVERSA.md` |
| Specs de módulos piloto | `specs/` (issue #164, PR #169) |
| Constitución v1.0.0 (ratificada) | `.specify/memory/constitution.md` · PR #155 |
| Guía de instalación Spec Kit | `docs/GUIA_INSTALACION_SPEC_KIT.md` |
| Propuesta Kiro vs Spec Kit | `docs/sdd-proposal.md` |
| Brechas y hoja de ruta SDD formal | `docs/SDD_BRECHAS_Y_HOJA_DE_RUTA.md` |

## 6. Conclusión

SDD convierte a GoblinHub en un proyecto donde "¿funciona?" se responde con
evidencia ejecutable, no con opiniones. Los módulos piloto (E2E, tour, IaC y
MCP+IA) demuestran el ciclo completo y dejan la base para extenderlo a los flujos
pendientes detectados en la ingeniería inversa (inscripciones, canjes,
intereses/disponibilidad, admin de productos).