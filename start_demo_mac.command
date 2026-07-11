#!/bin/bash
# NeuroFocus one-click demo launcher for macOS.
# Double-click this file in Finder (first time: right-click → Open).
# Starts the EEG bridge (Python) and the local site (Node), then opens the browser.
#
# Prerequisites (one-time):
#   1. Install Python 3 and Node.js
#   2. pip3 install -r requirements-eeg-bridge.txt
#   3. Pair "MindWave Mobile 2" in System Settings → Bluetooth
#
# The bridge finds the headset on /dev/cu.* / /dev/tty.* automatically.
# If macOS blocks the serial port, grant Bluetooth permission to Terminal in
# System Settings → Privacy & Security → Bluetooth, then run this again.

cd "$(dirname "$0")"

echo "[NeuroFocus] Starting EEG bridge (Python)..."
python3 eeg_bridge.py &
BRIDGE_PID=$!

echo "[NeuroFocus] Starting local site on http://localhost:8000 ..."
node server.js &
SITE_PID=$!

sleep 2
open "http://localhost:8000/#home"

echo ""
echo "[NeuroFocus] Demo running. Close this window or press Ctrl+C to stop both."
trap "kill $BRIDGE_PID $SITE_PID 2>/dev/null" EXIT
wait
