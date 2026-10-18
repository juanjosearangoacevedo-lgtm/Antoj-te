@echo off
REM ============================================================
REM  Antojate - Levanta backend y frontend (uso diario)
REM  Uso: doble clic, o en la terminal de VS Code:  .\iniciar.bat
REM ============================================================
cd /d "%~dp0"

start "Antojate Backend (puerto 3000)"  cmd /k "cd /d ""%~dp0codigo_definitivo\backend"" && npm run dev"
start "Antojate Frontend (puerto 5173)" cmd /k "cd /d ""%~dp0codigo_definitivo\frontend"" && npm run dev"

timeout /t 6 /nobreak >nul
start http://localhost:5173/login

echo Backend:  http://localhost:3000/health
echo Frontend: http://localhost:5173
echo Menu:     http://localhost:5173/menu?mesa=bitemo-demo
echo Login:    admin@bitemo.com / (la clave que pusiste en setup.bat)
