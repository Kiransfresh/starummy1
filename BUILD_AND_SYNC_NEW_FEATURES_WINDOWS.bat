@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Star Rummy - Build New Features

echo =====================================================
echo   STAR RUMMY - NEW FEATURES CLEAN BUILD + ANDROID SYNC
echo =====================================================
echo.
echo Project: %CD%
echo.

if not exist "package.json" (
  echo ERROR: package.json not found. Extract the whole ZIP first.
  pause
  exit /b 1
)
if not exist "src\main.jsx" (
  echo ERROR: src\main.jsx is missing.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed or not in PATH.
  echo Install Node.js LTS, reopen this folder, then run this file again.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm is not available.
  pause
  exit /b 1
)

echo [1/7] Removing OLD node_modules, Vite cache, dist and Android web assets...
if exist "node_modules" rmdir /s /q "node_modules"
if exist ".vite" rmdir /s /q ".vite"
if exist "dist" rmdir /s /q "dist"
if exist "android\app\src\main\assets\public" rmdir /s /q "android\app\src\main\assets\public"
mkdir "android\app\src\main\assets\public" >nul 2>nul

echo [2/7] Installing clean WINDOWS dependencies...
call npm install
if errorlevel 1 goto :fail

echo [3/7] Ensuring Framer Motion optional Emotion dependency is present...
call npm install @emotion/is-prop-valid@1.4.0 --save
if errorlevel 1 goto :fail

echo [4/7] Building CURRENT React source with the new features...
call npm run build
if errorlevel 1 goto :fail

if not exist "dist\index.html" (
  echo ERROR: Vite finished without dist\index.html.
  goto :fail
)

echo [5/7] Copying the NEW build into Android with Capacitor...
call npx cap sync android
if errorlevel 1 goto :fail

if not exist "android\app\src\main\assets\public\index.html" (
  echo ERROR: Android assets were not synced.
  goto :fail
)

echo [6/7] Verifying Android no longer contains the stale build marker...
if exist "android\app\src\main\assets\public\BUILD_REQUIRED.txt" del /q "android\app\src\main\assets\public\BUILD_REQUIRED.txt"

echo [7/7] Opening Android Studio...
call npx cap open android
if errorlevel 1 (
  echo Android sync succeeded, but Android Studio could not be opened automatically.
  echo Open the android folder manually in Android Studio.
)

echo.
echo =====================================================
echo SUCCESS: NEW FEATURES ARE BUILT AND SYNCED TO ANDROID.
echo =====================================================
echo.
echo In Android Studio use Build ^> Clean Project, then Run.
pause
exit /b 0

:fail
echo.
echo =====================================================
echo BUILD FAILED - read the first error above.
echo =====================================================
echo Do not open/run the old Android build until this script completes.
pause
exit /b 1
