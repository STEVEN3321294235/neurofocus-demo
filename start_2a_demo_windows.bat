@echo off
cd /d "%~dp0"
title NeuroFocus 2A Demo Launcher

echo ========================================
echo NeuroFocus 2A Demo Launcher
echo ========================================
echo This will launch:
echo 1. EEG Bridge
echo 2. Local static site
echo 3. Browser at http://localhost:8000/#home
echo ========================================

start "NeuroFocus EEG Bridge" cmd /k call "%~dp0start_eeg_bridge_windows.bat"
timeout /t 2 >nul
start "NeuroFocus Local Site" cmd /k call "%~dp0start_local_site_windows.bat"
timeout /t 3 >nul
start "" "http://localhost:8000/#home"

echo Demo startup commands launched.
echo If browser does not open automatically, visit:
echo http://localhost:8000/#home
pause
