@echo off
setlocal
set "URL=https://starummy1-production.up.railway.app"
echo ================================================
echo STAR RUMMY - LIVE RAILWAY SERVER TEST
echo ================================================
echo Testing: %URL%
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $r=Invoke-RestMethod -Uri '%URL%' -Method Get -TimeoutSec 20; $r | ConvertTo-Json -Compress; if(-not $r.ok){exit 2}"
if errorlevel 1 (
  echo.
  echo ERROR: Railway server did not pass the health check.
  echo Check Railway deployment/logs and internet connection.
  pause
  exit /b 1
)
echo.
echo SUCCESS: Railway multiplayer server is LIVE.
echo App backend URL is configured to:
echo %URL%
pause
