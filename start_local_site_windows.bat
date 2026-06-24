@echo off
cd /d "%~dp0"
title NeuroFocus Local Site

if defined PORT (
  set SITE_PORT=%PORT%
) else (
  set SITE_PORT=8000
)

where node >nul 2>nul
if %errorlevel%==0 (
  set PORT=%SITE_PORT%
  node server.js
  goto end
)

echo Node.js not found. Use the deployed site instead:
echo https://neurofocus-demo.vercel.app/#home

:end
pause
