# Propuesta de Spec Driven Development (SDD) y Guía de Herramientas

> Entregable de la Actividad 1.1 — propuesta original que justifica la adopción
> de **Spec Kit** y compara **Kiro** vs **Spec Kit** para GoblinHub.

## 1. Contexto y decisión: Kiro vs Spec Kit

Para estandarizar el desarrollo basado en especificaciones evaluamos dos
alternativas principales. **Decisión final: Spec Kit (GitHub).**

| Criterio | Kiro | GitHub Spec Kit |
|---|---|---|
| Qué es | IDE/agente completo basado en Code OSS | Framework/toolkit que se monta sobre tu agente |
| Flujo de specs | Integrado visualmente en el IDE | Archivos + comandos `/speckit.*` |
| Flujo principal | Requirements → Design → Constitution → Spec → Plan → Tasks → implementación | Spec → Plan → Tasks → Implement → Converge |
| Agente incluido | Sí | No; usa el que tú quieras (opencode, Claude, Copilot…) |
| Independencia del modelo/agente | Menor | Muy alta |
| VS Code | Es básicamente su propio editor (Code OSS) | Funciona con agentes dentro de VS Code |
| CLI | Kiro CLI | `specify` CLI |
| Reglas permanentes | `.kiro/steering/` | Constitution + presets/extensiones |
| Automatización | Hooks muy potentes | Workflows/extensiones |
| MCP | Nativo | Depende del agente |
| Open source | No completamente como producto | Sí, MIT |
| Portabilidad | Ecosistema Kiro | 38+ integraciones actualmente |
| Curva inicial | Más sencilla | Algo más de configuración |
| Personalización del proceso | Buena | Excelente |

### Por qué Spec Kit gana en GoblinHub

- **Integración nativa con GitHub** (issues, PRs, `Closes #id`) y con los
  pipelines ya existentes (`api.yml`, `web.yml`).
- **Agente libre**: usamos **opencode** (integración instalada en
  `.specify/integration.json`); también soporta Claude, Copilot, Gemini, Codex.
- **Concepto de convergencia** (`/speckit.converge`) que compara el código real
  contra spec/plan/tareas, algo único frente a Kiro.
- **Costo cero y open source (MIT)** para un proyecto académico/universitario.
- **Ecosistema**: 38+ integraciones y extensiones (bug, assess, git, selftest).

## 2. Guía de instalación y configuración (Spec Kit)

La instalación y configuración se documenta en `GUIA_INSTALACION_SPEC_KIT.md`.
Resumen de lo ejecutado en el repo:

1. `uv tool install specify-cli` → CLI `specify` v1.0.6 (`specify --version`).
2. `specify init --here --force --non-interactive --integration opencode` →
   crea `.specify/` (constitution, templates, workflows).
3. Se ratificó la **Constitución v1.0.0** (PR #155).
4. Comandos `speckit.*` instalados en `.opencode/commands/` (10 comandos).
5. Workflow oficial instalado en `.specify/workflows/speckit/workflow.yml`.

## 3. Estado del proyecto y plan de adopción

1. **Diagnóstico/Ingeniería inversa**: `docs/INGENIERIA_INVERSA.md` (ER Mermaid,
   trazabilidad backend/frontend, análisis y brechas B1–B11).
2. **Specs de módulos piloto**: `specs/` (PR #169) para pruebas E2E (a), tour
   guiado (b), infraestructura como código (c) y casos de prueba E2E.
3. **Módulo AU**: automatización E2E con Playwright MCP + IA (PR #171).
4. **Hoja de ruta SDD formal**: `docs/SDD_BRECHAS_Y_HOJA_DE_RUTA.md`.

## 4. Referencias

- Repositorio: <https://github.com/github/spec-kit>
- Documentación: <https://github.github.io/spec-kit/>
- SDD (origen): <https://scrummanager.com/community/spec-driven-development-qu-es-de-dnde-viene-y-por-qu-importa>
- Charlas: <https://www.youtube.com/watch?v=sCQrrOrr43E> · <https://www.youtube.com/watch?v=2kXr9PvOoPc>