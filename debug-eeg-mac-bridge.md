[OPEN] EEG Mac Bridge Debug Session

# Session
- session_id: `eeg-mac-bridge`
- scope: Verify the shortest working path from MindWave Mobile 2 to Mac, then into browser gameplay.
- rule: No business-logic fix before runtime evidence is collected.

# Symptoms
- `.venv/bin/pip` points to an old iCloud project path and cannot run.
- `.venv/bin/python3 eeg_bridge.py` can still start a WebSocket server on `ws://localhost:8765`.
- `/dev/cu.MindWaveMobile` exists on macOS.
- `server.js` fails on fixed ports when the port is already occupied.
- User reports that real EEG data used to work in Python, but web integration is unreliable.

# Expected
- The headset can be paired on macOS, then connected on demand by the bridge.
- The bridge can open the MindWave serial device and stream EEG data to the browser.
- The game can always enter with fallback questions even if AI generation fails.

# Hypotheses
1. The current blocker for real EEG is not pairing, but Python environment drift: the virtualenv was copied/moved and its `pip` entrypoint still targets an old iCloud path.
2. The bridge can start, but no live EEG reaches the browser because the serial port is never opened, or opens only after a `start_eeg` WebSocket action from the page.
3. The web app appears "stuck before game" because the local server port conflict prevents the latest frontend code from running, so the fallback-question path is not being tested consistently.
4. The AI issue is secondary right now: the game runtime should still be able to enter with fallback questions, so another initialization path is likely blocking game start in some runs.
5. The MindWave "disconnect after pairing, connect on demand later" behavior is consistent with the bridge design and macOS serial behavior, not necessarily a device fault.

# Evidence Log
- 2026-06-23: User terminal shows `WebSocket server started on ws://localhost:8765`.
- 2026-06-23: User terminal shows `/dev/cu.MindWaveMobile`.
- 2026-06-23: User terminal shows `.venv/bin/pip` references old path `/Users/cck108/Library/Mobile Documents/com~apple~CloudDocs/EEG 2026/...`.
- 2026-06-23: User terminal shows `server.js` port conflicts on `8123`.
- 2026-06-23: Debug logs confirm browser opened a WebSocket to the bridge, sent `start_eeg`, and the bridge received it.
- 2026-06-23: Debug logs confirm the bridge attempted to open `/dev/cu.MindWaveMobile` and failed with `Operation not permitted`.
- 2026-06-23: Debug logs confirm the boat model loaded successfully; the gameplay hang was instead caused by a missing `assets/foam.jpg` texture that left the texture promise unresolved.
- 2026-06-23: Applied a minimal fix so missing optional texture assets no longer block the game start path.

# Next Evidence To Collect
- Confirm that the game can now enter after the texture fallback fix.
- Confirm whether running the bridge from the user's own Terminal with correct macOS permissions still raises `Operation not permitted`.
- Confirm whether real EEG packets arrive once the serial permission issue is resolved.

# Status
- current_phase: root-cause-confirmed-and-minimal-fix-applied
- code_logic_modified: yes
