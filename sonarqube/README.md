# SonarQube — Stack local (sin Docker)

Guía del stack **SonarQube local sin Docker** usado para el análisis de calidad
asignado a Sadrach. Complementa la issue [#184](https://github.com/CodeCastersD20/GoblinHub_CodeCasters/issues/184)
(instalación del stack) y la [#185](https://github.com/CodeCastersD20/GoblinHub_CodeCasters/issues/185)
(escaneo del PR asignado).

## Componentes

| Componente | Versión | Ruta de descarga |
| --- | --- | --- |
| SonarQube Community LTS | 9.9.5.90363 | `https://binaries.sonarsource.com/Distribution/sonarqube/sonarqube-9.9.5.90363.zip` |
| sonar-scanner-cli | 6.2.1.4610 (linux-x64) | `https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-6.2.1.4610-linux-x64.zip` |
| JDK 17 (Temurin, portable) | 17.0.20.1 | `https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.20.1%2B1/OpenJDK17U-jdk_x64_linux_hotspot_17.0.20.1_1.tar.gz` |

> Nota descarga: `binaries.sonarsource.com` bloquea `HEAD`/listing, usa
> `curl -A "Mozilla/5.0" -LO <url>` (GET directo).

## Puesta en marcha

```bash
# 1. JDK 17 portable (SonarQube 9.9 NO funciona con Java 26 del sistema)
export SONAR_JAVA_PATH=/ruta/jdk17/bin/java   # <- clave: sin esto usa /usr/bin/java y ES muere

# 2. Arrancar el servidor (H2 embebido por defecto en Community LTS, puerto 9000)
cd sonarqube-9.9.5.90363
bin/linux-x86-64/sonar.sh start
# Log: logs/sonar.log ; esperar "SonarQube is operational"

# 3. Verificar status
curl -s http://localhost:9000/api/system/status   # -> {"status":"UP"}

# 4. Credenciales iniciales: admin / admin
```

## Crear token y proyecto (API)

```bash
# Token
curl -u admin:admin -X POST http://localhost:9000/api/user_tokens/generate \
  -d "name=goblinhub-sadrach-scan"          # -> { "token": "squ_..." }

# Proyecto
curl -u admin:admin -X POST http://localhost:9000/api/projects/create \
  -d "name=GoblinHub&project=goblinhub"
```

## Ejecutar el escaneo

```bash
# 0. (opcional) Cobertura real desde el API
cd goblinhub-api
npx jest --coverage --coverageReporters=lcov --coverageDirectory=/tmp/sonar/lcov

# 1. Config en el repo (sources = todo, exclusions de node_modules/dist/specs/...)
#    sonarqube/sonar-project.properties (declara la ruta del lcov.info)

# 2. Escanear
sonar-scanner -Dsonar.host.url=http://localhost:9000 -Dsonar.login="$TOKEN" \
  -Dproject.settings=sonarqube/sonar-project.properties

# 3. Consultar métricas
curl -u admin:admin "http://localhost:9000/api/measures/component?component=goblinhub&metricKeys=bugs,vulnerabilities,security_hotspots,code_smells,coverage,alert_status"
```

## Solución de problemas frecuentes

- **Elasticsearch cae al arrancar** → ES requiere el mismo JDK 17: verifica que
  `SONAR_JAVA_PATH` apunte a `jdk17/bin/java` antes de `sonar.sh start`
  (el script usa `SONAR_JAVA_PATH`, no respeta `JAVA_HOME`).
- **`Unable to open Git repository` en worktrees** → el módulo SCM/JGit falla con
  worktrees fuera del repo; escanea desde la copia del repo (rama/commit a analizar)
  o desactiva SCM con `-Dsonar.scm.disabled=true`.
- **Puerto ocupado** → `conf/sonar.properties`: `sonar.web.port=9000`.
- **Java 26 o superior** → no soportado por SonarQube 9.9; usa JDK 17 portable.

## Métricas de referencia

Resultado del escaneo del PR #192: ver [`RESULTADOS_SADRACH.md`](./RESULTADOS_SADRACH.md)
(Quality Gate OK, 0 bugs, 0 vulns, coverage 87.4%).