@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules" (
  echo Installing dependencies first...
  call npm install
  if errorlevel 1 goto :fail
)
call npm run dev -- --force
if errorlevel 1 goto :fail
exit /b 0
:fail
echo.
echo Start failed. Read the error above.
pause
exit /b 1
