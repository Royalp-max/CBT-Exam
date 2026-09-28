@echo off
cd /d "%~dp0"

set "NODE=C:\Program Files\nodejs\node.exe"
set "NPM=C:\Program Files\nodejs\npm.cmd"

if not exist "%NODE%" (
  echo Node.js was not found at %NODE%
  echo Please install Node.js LTS from: https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing project dependencies...
  "%NPM%" install
)

echo Starting School CBT app...
"%NPM%" start
