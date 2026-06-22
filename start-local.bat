@echo off
setlocal

cd /d "%~dp0"

where npm >nul 2>&1
if errorlevel 1 (
  echo Node.js and npm are required to start JumpForge.
  echo Install Node.js from https://nodejs.org/ and then run this file again.
  goto :error
)

if not exist "node_modules" (
  echo Installing project dependencies for the first time...
  call npm install
  if errorlevel 1 goto :error
)

echo Starting JumpForge...
call npm run dev -- --host 127.0.0.1 --open
if errorlevel 1 goto :error

exit /b 0

:error
echo.
echo JumpForge could not be started. Review the message above and try again.
pause
exit /b 1
