@echo off
cd /d "%~dp0"
title NeuroFocus EEG Bridge Installer

echo ========================================
echo NeuroFocus EEG Bridge Dependency Install
echo ========================================

if exist ".venv\Scripts\python.exe" (
  ".venv\Scripts\python.exe" -m pip install --upgrade pip
  ".venv\Scripts\python.exe" -m pip install -r requirements-eeg-bridge.txt
  goto end
)

where py >nul 2>nul
if %errorlevel%==0 (
  py -m pip install --upgrade pip
  py -m pip install -r requirements-eeg-bridge.txt
  goto end
)

where python >nul 2>nul
if %errorlevel%==0 (
  python -m pip install --upgrade pip
  python -m pip install -r requirements-eeg-bridge.txt
  goto end
)

echo Python not found. Please install Python first.

:end
pause
