# Windows 2A Deployment SOP

## Goal

Use the Windows laptop as the on-site demo machine with:

1. Local Python EEG bridge
2. Local static site at `http://localhost:8000/#home`
3. Real EEG as main path
4. Simulation Mode as backup path

## Files To Copy To Windows

- `index.html`
- `app/`
- `pages/`
- `services/`
- `styles/`
- `components/`
- `assets/`
- `bgm/`
- `server.js`
- `eeg_bridge.py`
- `requirements-eeg-bridge.txt`
- `install_eeg_bridge_windows.bat`
- `start_eeg_bridge_windows.bat`
- `start_local_site_windows.bat`
- `start_2a_demo_windows.bat`

## One-Time Preparation

1. Install Python 3
2. Install Node.js
3. Pair `MindWave Mobile 2` in Windows Bluetooth
4. Double-click `install_eeg_bridge_windows.bat`

## Demo Startup

1. Plug in power adapter
2. Set Windows Power Mode to `Best performance`
3. Turn on browser hardware acceleration
4. Close Teams, OneDrive sync, Discord, extra browser tabs
5. Turn on MindWave headset
6. Double-click `start_2a_demo_windows.bat`
7. Wait for two windows:
   - EEG Bridge
   - Local Site
8. Browser opens `http://localhost:8000/#home`
9. Enter setup and test:
   - `EEG Device`
   - if unavailable, switch to `Simulation Mode`

## Fast Validation

### Local Site

- Open `http://localhost:8000/#home`
- Homepage should feel smooth
- Setup / Auth page should not lag heavily

### EEG Bridge

- EEG bridge window should not exit immediately
- If it shows a COM port and connected status, proceed to EEG mode
- If EEG cannot connect in time, use Simulation Mode immediately

## Exhibition Fallback Rule

- Real EEG works: use EEG mode
- Real EEG unstable: switch to Simulation Mode without delay
- Never spend more than 1-2 minutes fixing hardware in front of visitors

## Emergency Checklist

- New AAA battery
- Clean forehead sensor contact
- Re-open `start_2a_demo_windows.bat`
- If bridge fails, use Simulation Mode
