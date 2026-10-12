@echo off
setlocal
REM ============================================================
REM  Bitemo - Configuracion inicial (ejecutar UNA sola vez)
REM  Uso: doble clic, o en la terminal de VS Code:  .\setup.bat
REM
REM  La contrasena de MySQL se toma de la variable de entorno
REM  BITEMO_DB_PASS. Si no esta definida, se pide por consola.
REM  (Antes estaba escrita aqui dentro y termino en el repositorio.)
REM ============================================================

set DB_NAME=menu_digital_saas
set BACKEND=%~dp0codigo_definitivo\backend
set FRONTEND=%~dp0codigo_definitivo\frontend
cd /d "%~dp0"

if "%BITEMO_DB_PASS%"=="" (
  set /p BITEMO_DB_PASS=Contrasena de MySQL para el usuario root:
)
set DB_PASS=%BITEMO_DB_PASS%

REM --- 1. Localizar mysql.exe ---
set MYSQL=mysql
where mysql >nul 2>nul
if errorlevel 1 (
  if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" set "MYSQL=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
  if exist "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" set "MYSQL=C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"
  if exist "C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe" set "MYSQL=C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe"
  if exist "C:\xampp\mysql\bin\mysql.exe" set "MYSQL=C:\xampp\mysql\bin\mysql.exe"
)

echo.
echo [1/6] Verificando conexion a MySQL...
"%MYSQL%" -u root -p%DB_PASS% -e "SELECT 1;" >nul 2>nul
if errorlevel 1 (
  echo   ERROR: No pude conectarme a MySQL. Verifica que el servicio este corriendo
  echo   y que la contrasena sea correcta.
  pause
  exit /b 1
)

REM --- 2. Verificar que la base de la demo exista ---
"%MYSQL%" -u root -p%DB_PASS% -e "USE %DB_NAME%; SELECT COUNT(*) FROM restaurantes;" >nul 2>nul
if errorlevel 1 (
  echo   ERROR: La base "%DB_NAME%" no existe o no tiene las tablas de la demo.
  echo   Cargala primero con: codigo_definitivo\backend\migrations\bitemo_completo.sql
  pause
  exit /b 1
)

echo [2/6] Aplicando migraciones...
for %%M in (
  "2026-07-18_planes_features_temas.sql"
  "2026-07-21_platos_video_bunny.sql"
  "2026-07-22_platos_recomendado_horario.sql"
  "2026-07-22_restaurantes_moneda.sql"
  "2026-07-22_tema_layout_categorias.sql"
  "2026-07-31_unificar_collation.sql"
  "2026-07-31_tema_personalizacion_avanzada.sql"
  "2026-08-02_solicitudes_demo.sql"
  "2026-08-03_demo_videos_bunny.sql"
  "2026-08-04_llamados_mesero_y_bienvenida.sql"
) do (
  if exist "%BACKEND%\migrations\%%~M" (
    "%MYSQL%" -u root -p%DB_PASS% --force %DB_NAME% < "%BACKEND%\migrations\%%~M" 2>nul
    echo   aplicada %%~M
  )
)
echo   OK (los avisos de columnas duplicadas son normales si ya se aplicaron antes)

echo [3/6] Instalando dependencias del backend...
pushd "%BACKEND%"
call npm install --no-audit --no-fund

echo [4/6] Sembrando roles, planes y superadmin...
call npm run seed:roles
call npm run seed:planes
set /p SUPERADMIN_PASS="Clave para el superadmin (minimo 8 caracteres): "
call npm run create:superadmin -- "Juan Jose" admin@bitemo.com "%SUPERADMIN_PASS%"

echo [5/6] Ejecutando las pruebas del backend...
call npm test
popd

echo [6/6] Instalando dependencias del frontend...
pushd "%FRONTEND%"
call npm install --no-audit --no-fund
popd

echo.
echo ============================================================
echo  LISTO. Ahora ejecuta:  .\iniciar.bat
echo  Login superadmin: admin@bitemo.com  /  la clave que acabas de escribir
echo ============================================================
pause
