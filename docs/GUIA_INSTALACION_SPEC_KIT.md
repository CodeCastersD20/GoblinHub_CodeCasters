# Guía de instalación: Spec Kit

[Spec Kit](https://github.com/github/spec-kit) es un toolkit de código abierto para desarrollo dirigido por especificaciones (Spec-Driven Development). Define **qué** quieres construir antes de construir **cómo**, y funciona con más de 30 agentes de IA, incluido **opencode**.

---

## 1. Requisitos previos

- **uv** (gestor de paquetes de Python) — recomendado, o `pipx` como alternativa.
- **Python 3.11+**
- **Git**
- Un agente de codificación con IA soportado (opencode, Claude Code, Copilot, etc.).

Verifica tu entorno:

```bash
uv --version      # >= 0.4
python3 --version # >= 3.11
git --version
```

> Instala uv si no lo tienes: `curl -LsSf https://astral.sh/uv/install.sh | sh`

---

## 2. Instalar el CLI `specify`

Reemplaza `vX.Y.Z` por el [último release](https://github.com/github/spec-kit/releases) (ej. `v1.0.6`), conservando la `v` inicial:

```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.0.6
```

Alternativas:

```bash
# Desde PyPI (versión publicada)
uv tool install specify-cli

# Con pipx
pipx install specify-cli
```

### Verificar la instalación

```bash
specify --version   # ej. "specify 1.0.6"
specify check       # comprueba herramientas y agentes instalados
```

---

## 3. Inicializar un proyecto

Crear un proyecto nuevo:

```bash
specify init mi-proyecto --integration opencode
cd mi-proyecto
```

Inicializar en el directorio actual (útil en repos existentes):

```bash
specify init --here --force --non-interactive --integration opencode
```

- `--non-interactive`: evita prompts (CI/agentes); usa valores por defecto.
- `--force`: permite inicializar sobre un directorio que ya tiene contenido.
- `--integration <agente>`: elige tu agente (opencode, claude, copilot, gemini, codex…). Obtén la lista con `specify check`.

> `opencode` instala los comandos `speckit.*` en `.opencode/commands/`. Otras integraciones (ej. Claude) usan sus propias carpetas (`.claude/commands/`).

---

## 4. Flujo de trabajo con los comandos

Abre tu agente en el directorio del proyecto y usa los comandos `speckit.*`:

| Paso | Comando | Descripción |
|---|---|---|
| 0 | `/speckit.constitution` | Crea los principios rectores del proyecto (una vez). |
| 1 | `/speckit.specify` | Define qué construir (requisitos y user stories). |
| 2 | `/speckit.clarify` | Aclara áreas poco definidas (recomendado). |
| 3 | `/speckit.plan` | Crea el plan técnico con tu stack. |
| 4 | `/speckit.tasks` | Genera la lista de tareas accionables. |
| 5 | `/speckit.implement` | Ejecuta las tareas para construir la feature. |
| 6 | `/speckit.converge` | Compara el código contra spec/plan/tareas. |

Repite los pasos 5 y 6 hasta que `/speckit.converge` reporte **Converged**.

Comandos opcionales: `/speckit.analyze`, `/speckit.checklist`, `/speckit.taskstoissues`.

Extensiones disponibles:

```bash
specify extension search       # buscar extensiones
specify extension add <nombre> # instalar (ej. bug, assess, git, selftest)
```

---

## 5. Actualizar

```bash
specify self check              # ¿hay una versión más nueva? (solo lectura)
specify self upgrade --dry-run  # previsualizar el upgrade
specify self upgrade            # actualizar en sitio
specify self upgrade --tag vX.Y.Z[suffix]  # fijar un release concreto
```

---

## 6. Solución de problemas

| Problema | Solución |
|---|---|
| `specify` no se encuentra en el PATH | `source ~/.local/bin/env` o reabre la terminal. |
| `Not a Spec Kit project` | Ejecuta el comando desde la raíz del proyecto (con `.specify/`). |
| `init` se cuelga en un picker | Usa `--non-interactive` (agentes) o `--integration <agente>`. |
| Quiero otro agente tras inicializar | Vuelve a ejecutar `specify init --here --force --integration <agente>`. |
| Instalación lenta (clonado/build) | Es normal la primera vez: compila desde git. Alternativa: `uv tool install specify-cli` (PyPI). |

---

## Referencias

- Repositorio: https://github.com/github/spec-kit
- Documentación completa: https://github.github.io/spec-kit/
- Metodología (spec-driven.md): https://github.com/github/spec-kit/blob/main/spec-driven.md