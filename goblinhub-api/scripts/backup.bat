@echo off
:: =============================================================
:: GoblinHub — Script de Respaldo de Base de Datos (Windows)
:: Uso: scripts\backup.bat
:: Requiere: pg_dump en PATH y DATABASE_URL en .env
:: =============================================================

setlocal EnableDelayedExpansion

:: Cargar variables desde .env si existe
set "ENV_FILE=%~dp0..\.env"
if exist "%ENV_FILE%" (
  for /f "usebackq tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
    set "line=%%A"
    if not "!line:~0,1!"=="#" (
      if not "%%A"=="" (
        set "%%A=%%B"
      )
    )
  )
)

:: Validar DATABASE_URL
if "%DATABASE_URL%"=="" (
  echo [ERROR] La variable DATABASE_URL no esta definida.
  echo         Asegurate de tener un archivo .env con DATABASE_URL configurado.
  exit /b 1
)

:: Verificar que pg_dump este disponible
where pg_dump >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERROR] 'pg_dump' no esta instalado o no esta en el PATH.
  echo         Descargalo desde: https://www.postgresql.org/download/windows/
  exit /b 1
)

:: Crear carpeta backups si no existe
set "BACKUP_DIR=%~dp0..\backups"
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: Generar timestamp para el nombre del archivo
for /f "tokens=1-3 delims=/" %%a in ("%DATE%") do (
  set "DAY=%%a"
  set "MON=%%b"
  set "YR=%%c"
)
for /f "tokens=1-2 delims=:." %%a in ("%TIME: =0%") do (
  set "HR=%%a"
  set "MIN=%%b"
)

set "TIMESTAMP=%YR%-%MON%-%DAY%_%HR%-%MIN%"
set "BACKUP_FILE=%BACKUP_DIR%\backup_%TIMESTAMP%.sql"

echo Iniciando respaldo de la base de datos...
echo Destino: %BACKUP_FILE%

pg_dump ^
  --dbname="%DATABASE_URL%" ^
  --no-password ^
  --format=plain ^
  --no-owner ^
  --no-acl ^
  --file="%BACKUP_FILE%"

if %errorlevel% equ 0 (
  echo.
  echo [OK] Respaldo completado exitosamente.
  echo      Archivo: %BACKUP_FILE%
) else (
  echo.
  echo [ERROR] El respaldo fallo. Revisa la conexion y las credenciales.
  exit /b 1
)

endlocal
