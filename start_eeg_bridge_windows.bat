@echo off
cd /d "%~dp0"
title NeuroFocus EEG Bridge

REM Optional: pass the MindWave's OUTGOING COM port to skip the scan entirely,
REM e.g.  start_eeg_bridge_windows.bat COM5
REM (Passing it here is safer than "set NEUROFOCUS_EEG_PORT=..." in another
REM window, which does not carry over when the .bat is double-clicked.)
set EEG_PORT_ARG=%1
if not "%EEG_PORT_ARG%"=="" echo Using MindWave port: %EEG_PORT_ARG%

if exist ".venv\Scripts\python.exe" (
  ".venv\Scripts\python.exe" eeg_bridge.py %EEG_PORT_ARG%
  goto end
)

where py >nul 2>nul
if %errorlevel%==0 (
  py eeg_bridge.py %EEG_PORT_ARG%
  goto end
)

where python >nul 2>nul
if %errorlevel%==0 (
  python eeg_bridge.py %EEG_PORT_ARG%
  goto end
)

echo Python not found. Please install Python or create .venv first.

:end
pause
