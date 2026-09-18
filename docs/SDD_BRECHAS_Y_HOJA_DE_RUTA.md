# Lo que falta para SDD formal en GoblinHub + Hoja de ruta

> Complemento de la Actividad 1.1 (liga de apoyo **d)** — espec drive development).
> Diagnóstico de la transición a SDD formal, con Spec Kit como habilitador.

## 1. Estado actual

| Dimensión SDD | Estado | Evidencia |
|---|---|---|
| Constitución (principios) | ✅ Ratificada v1.0.0 | `.specify/memory/constitution.md` (PR #155) |
| Instalación de Spec Kit | ✅ `specify` v1.0.6 + comandos `speckit.*` | `GUIA_INSTALACION_SPEC_KIT.md` |
| Ingeniería inversa / diagnóstico | ✅ Completa | `INGENIERIA_INVERSA.md` (ER Mermaid, trazabilidad, brechas B1–B11) |
| Specs de módulos piloto | ✅ Generadas | `specs/` (PR #169) |
| Specs ejecutables (tests = validación) | ✅ Parcial | Jest/Vitest/Playwright (19 E2E, 74 Vitest, cobertura Jest 85–100%) |
| Specs por módulo de negocio nuevo | ⚠️ Solo los piloto | a/b/c + casos → falta para canjes, inscripciones, novatos |
| Skills reutilizables | ⚠️ En construcción | skill `e2e-ia` (AU, PR #171) |
| CI = gate de convergencia | ⚠️ Gates sí; `/speckit.converge` no en CI | `api.yml`/`web.yml` |

## 2. Brechas para un SDD formal (GAPS)

| # | Gap | Impacto | Mitigación |
|---|---|---|---|
| G1 | Los módulos fuera de los pilotos no tienen `spec.md` (canjes, inscripciones, intereses/disponibilidad, admin de productos) | Falta trazabilidad spec→código en el core del negocio | Generar specs con `/speckit.specify` antes de implementar (test-first) |
| G2 | `/speckit.converge` no se ejecuta en CI | Deuda técnica visible solo en review | Workflow de convergencia en GitHub Actions para PRs con `specs/` |
| G3 | Las tareas de `tasks.md` no se convierten en issues | Pérdida de seguimiento granular | `/speckit.taskstoissues` para mapear tareas a issues |
| G4 | Pocos skills reutilizables | Cada feature se especifica desde cero | Skill `e2e-ia` + plantillas/presets de Spec Kit (`/speckit.checklist`) |
| G5 | `usuarios.email` no vive en BD (vive en Supabase Auth) | Panel admin sin email de cliente (B7) | Decisión de arquitectura documentada + spec de evolución |
| G6 | Migración de índices concurrentes dentro de transacción | Riesgo de despliegue (B…) | Migración documentada con `--no-transaction`/script manual (ver INGENIERIA_INVERSA) |

## 3. Hoja de ruta de SDD formal (propuesta)

```text
Q1 (actual)   ▸ Pilotos a/b/c + AU listos y verificados en CI (PRs #169, #170, #171)
Q2           ▸ Specs de negocio: inscripciones, canjes, admin de productos, novatos
             ▸ /speckit.taskstoissues en cada feature (tareas → issues)
Q3           ▸ Convergencia en CI (job speckit-converge cuando cambian specs/)
             ▸ Skills: e2e-ia, bug-triage, assess, git (extensiones de Spec Kit)
Q4           ▸ Delegación: cualquier feature nueva inicia con /speckit.specify
             ▸ Revisión cuatrimestral de Constitución (enmiendas vía PR)
```

## 4. Próximos pasos inmediatos

1. Cerrar el contrato de inscripción y el módulo de fidelidad **con spec previa**
   (`/speckit.specify` antes de escribir código).
2. Convertir `specs/` en el punto de entrada del onboarding (que la guía de
   instalación y la ingeniería inversa apunten a ella).
3. Ejecutar `/speckit.converge` al cierre de cada PR que toque un módulo con spec.

> Comandos de verificación rápida: `/speckit.checklist`, `/speckit.analyze`,
> `/speckit.taskstoissues`, `specify extension search`.