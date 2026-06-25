# NeuroFocus Windows / Mobile Handoff Prompt

## Copy-Paste Prompt

```text
This is the NeuroFocus EEG exhibition project.

Project path:
c:\Users\student\Downloads\Archive

Current situation:
- The public site already exists and Simulation Mode is the stable fallback.
- The preferred exhibition plan is 2A:
  1. Windows Laptop runs local site
  2. Windows Laptop runs Python EEG bridge
  3. iPads / phones run public site or Simulation fallback
- Windows previously had very low FPS on homepage and in game.
- The project has already been optimized for Windows:
  - homepage low-effects mode
  - shared UI low-effects mode
  - game performance profile with lower DPR / reduced shadows / reduced post-processing / reduced particles
- Windows currently can serve the site with:
  python -m http.server 8000
- Node.js may still be missing on Windows.
- Python EEG bridge exists:
  eeg_bridge.py
- Windows helper files already exist:
  install_eeg_bridge_windows.bat
  start_eeg_bridge_windows.bat
  start_local_site_windows.bat
  start_2a_demo_windows.bat
  WINDOWS_2A_DEPLOYMENT_SOP.md

Main goal now:
- Get the local site running
- Quickly verify Simulation Mode
- If possible, verify EEG bridge on Windows
- Do not spend too long debugging in front of visitors
- If EEG is unstable, immediately switch to Simulation Mode

Important constraints:
- Use normal browser (Chrome / Edge), not IDE Preview
- Prioritize exhibition stability over full feature completeness
- Simulation Mode must remain available at all times

Please continue from this state, inspect the local startup path, verify what already runs, and help complete the shortest path to a stable exhibition demo.
```

## Device Responsibilities

### Windows Laptop

- Main technical demo machine
- Run local site at `http://localhost:8000/#home`
- Run Python EEG bridge if possible
- Use for real EEG attempt
- If EEG fails, still use it as local backup machine

### iPad 1

- Main public interaction device
- Open public site
- Run Simulation Mode
- Give visitors a smooth playable experience

### iPad 2

- Backup public demo device
- Standby for judge viewing, extra participant, or if iPad 1 needs refresh

### MacBook Air / Pro

- Emergency repair / fallback control machine
- Backup copy of project files
- Use to hotfix text, CSS, or deployment if needed
- Use to show screenshots / video if anything breaks

## What To Do On Arrival

1. Plug in the Windows Laptop power adapter
2. Set Windows Power Mode to Best Performance
3. Open Chrome or Edge
4. Close background apps: Teams, OneDrive sync, Discord, extra tabs
5. Start local site
6. Open `http://localhost:8000/#home`
7. Test Simulation once from start to results
8. If admin is available:
   - install Node.js if needed
   - install Python packages if needed
   - run EEG bridge
9. Pair MindWave Mobile 2
10. Test EEG only after Simulation is confirmed working

## Fast Exhibition Rule

- If real EEG works: use it as highlight demo
- If real EEG is unstable: switch to Simulation immediately
- Never spend more than 1-2 minutes debugging hardware in front of visitors

## Last-Minute Must-Do

- Confirm public site opens
- Confirm local site opens
- Confirm at least one iPad can run Simulation
- Confirm QR code is ready
- Confirm screenshots / screen recording backup exists
- Confirm all chargers / batteries / extension board are packed
