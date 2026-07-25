@echo off
cd /d "%~dp0"
title NeuroFocus Local Site

if defined PORT (
  set SITE_PORT=%PORT%
) else (
  set SITE_PORT=8000
)

REM Node is preferred, but the booth machine only needs Python (it already runs
REM eeg_bridge.py), so serve_local.py is a full stand-in when Node is missing.
where node >nul 2>nul
if %errorlevel%==0 (
  set PORT=%SITE_PORT%
  node server.js
  goto end
)

echo Node.js not found - starting the Python server instead.
echo.

if exist ".venv\Scripts\python.exe" (
  set PORT=%SITE_PORT%
  ".venv\Scripts\python.exe" serve_local.py
  goto end
)

where py >nul 2>nul
if %errorlevel%==0 (
  set PORT=%SITE_PORT%
  py serve_local.py
  goto end
)

where python >nul 2>nul
if %errorlevel%==0 (
  set PORT=%SITE_PORT%
  python serve_local.py
  goto end
)

echo Neither Node.js nor Python was found on this machine.
echo Install Python 3, or use the deployed site instead:
echo https://neurofocus-demo.vercel.app/#home

:end
pause
