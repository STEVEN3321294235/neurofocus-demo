@echo off
cd /d "%~dp0"
title NeuroFocus EEG Bridge

if exist ".venv\Scripts\python.exe" (
  ".venv\Scripts\python.exe" eeg_bridge.py
  goto end
)

where py >nul 2>nul
if %errorlevel%==0 (
  py eeg_bridge.py
  goto end
)

where python >nul 2>nul
if %errorlevel%==0 (
  python eeg_bridge.py
  goto end
)

echo Python not found. Please install Python or create .venv first.

:end
pause
