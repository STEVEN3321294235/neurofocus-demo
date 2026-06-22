#!/bin/bash

# Get the directory where this script is located
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PYTHON="$PROJECT_DIR/.venv/bin/python3"

echo "========================================"
echo "🧠 EEG Game System Launcher"
echo "========================================"

# 1. Kill existing processes to avoid port conflicts
echo "Cleaning up old processes..."
pkill -f eeg_bridge.py
pkill -f node_bridge
pkill -f "node "
lsof -ti:8765 | xargs kill -9 2>/dev/null || true
sleep 1
# We try to kill port 8000 specifically or just warn user
# lsof -ti:8000 | xargs kill -9 2>/dev/null

# 2. Start EEG Bridge (Python BLE/Serial)
echo "Starting Python EEG Bridge..."
"$VENV_PYTHON" "$PROJECT_DIR/eeg_bridge.py" > "$PROJECT_DIR/bridge_log.txt" 2>&1 &
BRIDGE_PID=$!
echo "✅ EEG Bridge started (PID: $BRIDGE_PID)"


# 3. Start Web Server (The "Visual Interface")
echo "Starting Web Server..."
# Run custom static server with correct MIME handling for game assets
node "$PROJECT_DIR/server.js" > /dev/null 2>&1 &
SERVER_PID=$!
echo "✅ Web Server started (PID: $SERVER_PID)"

# 4. Wait a moment for servers to initialize
echo "Waiting for systems to initialize..."
sleep 2

# 5. Open Browser
echo "Opening Game in Default Browser..."
open "http://localhost:8000"

echo "========================================"
echo "🚀 System is RUNNING!"
echo "   - Web Interface: http://localhost:8000"
echo "   - EEG Bridge:    Running in background"
echo ""
echo "Press [CTRL+C] to stop everything and exit."
echo "========================================"

# 6. Keep script running and handle exit
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    kill $BRIDGE_PID 2>/dev/null
    kill $SERVER_PID 2>/dev/null
    pkill -f eeg_bridge.py # Safety net
    exit
}

# Trap SIGINT (Ctrl+C)
trap cleanup SIGINT

# Wait indefinitely
wait
