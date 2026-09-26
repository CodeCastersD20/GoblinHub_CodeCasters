# Política de seguridad — Snyk (módulo AU, issue #213)

Este documento define los umbrales de bloqueo, el proceso de excepciones y el
SLA de remediación para los escaneos de Snyk (dependencias, código e IaC)
descritos en [`README.md`](./README.md).

## 1. Umbrales y efecto en el pipeline

| Severidad | Efecto en el pipeline | SLA de remediación |
| --- | --- | --- |
| `critical` | **Bloquea** el PR y el push (gate por defecto) | 24 h |
| `high` | Se reporta (job summary + artefacto), no bloquea por defecto | 7 días naturales |
| `medium` | Se reporta | 30 días naturales |
| `low` | Se reporta | 90 días naturales |

El gate por defecto del workflow es `critical`
([`.github/workflows/snyk.yml`](../.github/workflows/snyk.yml)). Puede
simularse un umbral más estricto (`high`, `medium`, `low`) disparando el
workflow manualmente (`workflow_dispatch`) con el input `umbral`, sin tocar
código ni configuración persistente.

El SLA corre desde que el hallazgo aparece por primera vez en un reporte
publicado (job summary o artefacto), no desde la fecha del CVE.

## 2. Reglas de excepción (`.snyk`)

El archivo [`../.snyk`](../.snyk) es el único lugar donde se registran
excepciones. Reglas:

1. Solo se exceptúan hallazgos **sin parche disponible** o con impacto
   **demostrado como no alcanzable** en GoblinHub (ruta de código no usada,
   dependencia de solo-test, flujo inexistente en producción).
2. Toda entrada requiere: ID del hallazgo (o `path` si es una dependencia
   completa), **justificación escrita**, **responsable** (autor del PR que la
   agrega) y **fecha de expiración** (máximo 30 días naturales desde el alta).
3. La excepción caduca sola: al vencer, Snyk vuelve a reportar el hallazgo y,
   si su severidad iguala o supera el gate activo, el pipeline vuelve a
   fallar. No hay renovación automática.
4. Nunca se agrega un ID únicamente "para que el CI pase". Un hallazgo nuevo
   se corrige; solo se exceptúa bajo el criterio del punto 1.
5. Cambios a `.snyk` siguen el mismo flujo de PR revisado que cualquier otro
   archivo del repo (ver `AGENTS.md`): no se edita directamente en `develop`
   ni `main`.

Comando para registrar una excepción (CLI autenticada, desde la raíz del
repo):

```bash
snyk ignore --id=SNYK-JS-EXAMPLE-1234567 \
  --reason="Sin parche disponible; el flujo afectado no usa carga de archivos" \
  --expires=2026-10-31
```

## 3. Qué pasa si el escaneo falla o no corre

- **`SNYK_TOKEN` ausente** (p. ej. PR desde un fork): el job termina en verde
  pero con un `::warning::` visible — un pipeline verde sin análisis nunca
  debe ser silencioso.
- **Reporte JSON ilegible o con formato no reconocido**: `summarize.mjs`
  sale con código `2` y el job falla. Un escaneo roto no se trata como un
  escaneo limpio.
- **CVE nuevo publicado entre el escaneo y el merge**: no es responsabilidad
  del gate de ese PR; lo captura el `schedule` semanal sobre `main`.

## 4. Excepciones activas

Ninguna al momento de escribir este documento. Ver [`../.snyk`](../.snyk)
como fuente de verdad — esta sección es descriptiva, no autoritativa.

## 5. Proceso de remediación

| Paso | Quién | Qué hace | Salida |
| --- | --- | --- | --- |
| 1. Detección | Automático | El job publica el hallazgo en el *job summary* con ID, severidad, paquete y versión corregida | Tabla en la corrida de CI |
| 2. Clasificación (≤ 2 h) | Quien detecta | Decide si el código vulnerable es alcanzable desde una petición externa; si lo es, se escala a `critical` y bloquea | Comentario en el issue/PR |
| 3. Corrección (según SLA) | Autor del hallazgo | PR con el parche mínimo: `npm audit fix`, actualización del lockfile o ajuste de código | PR que vuelve a pasar los 4 jobs |
| 4. Excepción (si no hay parche) | Autor + revisión del equipo | Entrada en `.snyk` con justificación y vencimiento | Diff de `.snyk` en PR revisado |
| 5. Cierre | Quien corrigió | El hallazgo desaparece del reporte; se actualiza `RESULTADOS_*.md` con fecha y PR de remediación | Evidencia actualizada |

Criterio de alcanzabilidad aplicado a este repositorio: `sharp` y `multer`
**sí** son alcanzables — procesan el archivo que el usuario envía en
`POST /upload` y en la foto de perfil — por lo que se priorizan aunque Snyk los
clasifique `high` y el gate no los bloquee. El resto (`js-yaml`, `fast-uri`,
`browserslist`, cadena de Prisma) es dependencia de build o de CLI.

## 6. Inventario vigente y fase 2

El inventario medido de hallazgos heredados (11 `high`, 0 `critical`, 6
`medium`) está en
[`RESULTADOS_SADRACH.md` §3](./RESULTADOS_SADRACH.md). Ninguno cuenta con
excepción: son deuda conocida con fecha.

Fase 2 del módulo (requiere issue propia):

- Resolver las `high` heredadas y promover `high` a severidad bloqueante.
- Escanear las imágenes Docker publicadas desde el pipeline de release.
- Publicar el reporte SARIF en la pestaña *Security* de GitHub.
- Usar la Snyk Security GitHub App en lugar de la CLI para obtener alertas sin
  depender del `SNYK_TOKEN` de Actions.

## 7. Relación con los otros módulos

| Módulo | Qué encuentra | Dónde se reporta |
| --- | --- | --- |
| Snyk (AU, este módulo) | Vulnerabilidades en dependencias, código e infraestructura | Este módulo |
| SonarQube | Code smells, hotspots y cobertura | `sonarqube/RESULTADOS_*.md` |
| K6 | Rendimiento y SLA de respuesta | `k6/RESULTADOS_*.md` |
| `npm audit` | Mismo dataset que Snyk, sin credenciales | Evidencia de respaldo mientras no haya token |

Si SonarQube y Snyk señalan el mismo hallazgo, se reporta en el issue de
SonarQube y la corrección cierra ambos.
