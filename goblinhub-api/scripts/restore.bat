@echo off
:: =============================================================
:: GoblinHub — Script de Restauracion de Base de Datos (Windows)
:: Uso: scripts\restore.bat <ruta\al\backup.sql>
:: Requiere: psql en PATH y DATABASE_URL en .env
:: =============================================================

setlocal EnableDelayedExpansion

:: Validar argumento
if "%~1"=="" (
  echo [ERROR] Debes especificar el archivo de backup a restaurar.
  echo         Uso: scripts\restore.bat ^<ruta\al\backup.sql^>
  echo.
  echo         Ejemplo: scripts\restore.bat backups\backup_2026-02-27_10-00.sql
  exit /b 1
)

set "BACKUP_FILE=%~1"

:: Verificar que el archivo existe
if not exist "%BACKUP_FILE%" (
  echo [ERROR] No se encontro el archivo '%BACKUP_FILE%'.
  echo         Verifica la ruta e intenta de nuevo.
  exit /b 1
)

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

:: Verificar que psql este disponible
where psql >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERROR] 'psql' no esta instalado o no esta en el PATH.
  echo         Descargalo desde: https://www.postgresql.org/download/windows/
  exit /b 1
)

echo ADVERTENCIA: Esta operacion sobreescribira datos existentes en la base de datos.
echo Base de datos destino: %DATABASE_URL%
echo Archivo de respaldo:   %BACKUP_FILE%
echo.
set /p CONFIRM="^¿Deseas continuar? (s/N): "

if /i not "%CONFIRM%"=="s" (
  echo Operacion cancelada.
  exit /b 0
)

echo.
echo Iniciando restauracion desde: %BACKUP_FILE%

psql ^
  --dbname="%DATABASE_URL%" ^
  --no-password ^
  --file="%BACKUP_FILE%" ^
  --single-transaction

if %errorlevel% equ 0 (
  echo.
  echo [OK] Restauracion completada exitosamente.
) else (
  echo.
  echo [ERROR] La restauracion fallo. Revisa el archivo y la conexion.
  exit /b 1
)

endlocal
