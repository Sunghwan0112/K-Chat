@echo off
setlocal enabledelayedexpansion

set "PROJECT_ROOT=%~dp0.."
cd /d "%PROJECT_ROOT%"

if not exist "node_modules" (
  echo [K-Chat] node_modules not found. Running npm install...
  call npm install
  if errorlevel 1 (
    echo [K-Chat] npm install failed.
    exit /b 1
  )
)

echo [K-Chat] Starting server...
start "K-Chat Server" cmd /c "npm start"

set "APP_URL=http://localhost:3000"
if not "%KCHAT_URL%"=="" set "APP_URL=%KCHAT_URL%"

timeout /t 1 /nobreak >nul
start "" "%APP_URL%"

echo [K-Chat] Opened %APP_URL%
exit /b 0
