# SonarQube — Stack local (Docker Compose + PostgreSQL)

Guía del stack local de **SonarQube** para el análisis de calidad de código del
proyecto GoblinHub. Complementa la issue [#184](https://github.com/CodeCastersD20/GoblinHub_CodeCasters/issues/184)
(instalación del stack) y las issues de escaneo del PR asignado
([#185](https://github.com/CodeCastersD20/GoblinHub_CodeCasters/issues/185),
[#188](https://github.com/CodeCastersD20/GoblinHub_CodeCasters/issues/188)).

## Componentes

| Componente | Versión / Imagen |
| --- | --- |
| SonarQube Community LTS | `sonarqube:lts-community` (SonarQube 9.9) |
| Base de datos | `postgres:15` |
| sonar-scanner-cli | 6.x (por SO; v7+ no es compatible con SonarQube 9.9) |

## Requisitos previos

- Docker Engine 20.10+ y Docker Compose v2 (en Windows: Docker Desktop con WSL2).
- `sonar-scanner-cli` 6.x descargado y disponible en `PATH`. Descargas:
  `https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-6.2.1.4610-windows-x64.zip`
  (sustituir `windows-x64` por `linux-x64` / `macosx-x64` según el SO).

## Puesta en marcha

```bash
# 1. Preparar credenciales de la BD (usuario/contraseña locales del stack)
cp sonarqube/.env.example sonarqube/.env   # Windows PowerShell: Copy-Item sonarqube/.env.example sonarqube/.env

# 2. Levantar el stack (SonarQube + PostgreSQL)
docker compose -f sonarqube/docker-compose.yml up -d

# 3. Esperar a que SonarQube esté operativo (el primer arranque tarda unos minutos)
curl -s http://localhost:9000/api/system/status   # -> {"status":"UP"}
```

Acceder a <http://localhost:9000> con las credenciales iniciales `admin` / `admin`
y cambiar la contraseña en el primer acceso.

## Configurar el proyecto y el token

```bash
# Proyecto
curl -u admin:admin -X POST http://localhost:9000/api/projects/create \
  -d "name=GoblinHub&project=goblinhub"

# Token (solo se muestra una vez; guárdalo)
curl -u admin:admin -X POST http://localhost:9000/api/user_tokens/generate \
  -d "name=goblinhub-<tu-alias>-scan"          # -> { "token": "squ_..." }
```

## Generar la cobertura (opcional, para el Quality Gate con `coverage`)

```bash
cd goblinhub-api
npx jest --coverage --coverageReporters=lcov
# Genera goblinhub-api/coverage/lcov.info (ruta ya declarada en sonar-project.properties)
```

## Ejecutar el escaneo (cada integrante sobre su PR asignado)

Desde la **raíz del repo**, sobre la rama/commit a analizar:

```bash
# Linux / macOS
export TOKEN="squ_..."
sonar-scanner -Dsonar.host.url=http://localhost:9000 -Dsonar.login="$TOKEN" \
  -Dproject.settings=sonarqube/sonar-project.properties
```

```powershell
# Windows (PowerShell)
$env:TOKEN = "squ_..."
sonar-scanner "-Dsonar.host.url=http://localhost:9000" "-Dsonar.login=$env:TOKEN" `
  "-Dproject.settings=sonarqube/sonar-project.properties"
```

> Si el repo se trabaja como worktree o el módulo SCM da error, añadir
> `-Dsonar.scm.disabled=true`.

La configuración del análisis (proyecto, sources, exclusions y ruta de cobertura)
vive en [`sonarqube/sonar-project.properties`](./sonar-project.properties).

## Consultar métricas

```bash
curl -u admin:admin "http://localhost:9000/api/measures/component?component=goblinhub&metricKeys=bugs,vulnerabilities,security_hotspots,code_smells,coverage,alert_status"
```

## Solución de problemas frecuentes

- **SonarQube no arranca / Elasticsearch cae** → asigna al menos 2 GB de memoria
  a Docker (Docker Desktop → Settings → Resources) y vuelve a levantar el stack.
- **Puerto 9000 ocupado** → cambia el mapeo `9000:9000` en `docker-compose.yml` o
  detén el proceso que use el puerto.
- **El compose falla por credenciales** → verifica que `sonarqube/.env` existe
  (copiado de `.env.example`) antes de `up -d`.
- **`Not authorized` en el escaneo** → el token debe pasarse en `-Dsonar.login=`
  (equivalente a autenticarse como usuario); `sonar-scanner` 6.x no autentica con
  `-Dsonar.token=`.
- **Persistencia de datos** → proyecto, token y métricas persisten en los volúmenes
  de Docker; `docker compose -f sonarqube/docker-compose.yml down -v` los elimina,
  por lo que habría que recrear proyecto y token.

## Anexo: fallback sin Docker (zip + H2)

Para entornos sin Docker, se puede usar SonarQube Community LTS descargado como
zip con H2 embebido: requiere **JDK 17** en `SONAR_JAVA_PATH` (el 9.9 no funciona
con Java 21+) y `sonar-scanner-cli`. Pasos resumidos:

```bash
# JDK 17 portable y ejecutable de SonarQube descargados
export SONAR_JAVA_PATH=/ruta/jdk17/bin/java
cd sonarqube-9.9.5.90363 && bin/linux-x86-64/sonar.sh start   # esperar "SonarQube is operational"
curl -s http://localhost:9000/api/system/status               # -> UP
```

El resto (crear proyecto/token, generar cobertura y escanear) es idéntico a las
secciones anteriores. La configuración del stack no dockerizado documentada
originalmente para la issue #184 se mantiene aquí como referencia.