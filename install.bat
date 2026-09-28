@echo off
cd /d "%~dp0"
set "NPM=C:\Program Files\nodejs\npm.cmd"
if not exist "%NPM%" (
  echo Node.js npm executable was not found at %NPM%
  echo Install Node.js LTS first: https://nodejs.org
  pause
  exit /b 1
)
"%NPM%" install
pause
