import asyncio
import json
import os
import threading
import time
import urllib.request

import serial
import websockets
from serial.tools import list_ports


BAUD_RATE = 57600
PORT_RETRY_SECONDS = 3
NO_DATA_WARN_SECONDS = 5
DEBUG_SERVER_URL = "http://127.0.0.1:7777/event"
DEBUG_SESSION_ID = "eeg-mac-bridge"


class EEGBridge:
    def __init__(self):
        self.clients = set()
        self.running = True
        self.loop = None
        self.queue = asyncio.Queue()
        self.capture_enabled = False
        self.serial_conn = None
        self.current_port = None
        self.attention = 0
        self.meditation = 0
        self.signal_quality = 0
        self.last_data_time = 0
        self.last_status_message = None
        self.last_no_data_warning_at = 0
        self.permission_blocked = False

    def log(self, msg):
        ts = time.strftime("%H:%M:%S")
        print(f"{ts} {msg}", flush=True)

    # #region debug-point shared:bridge-report
    def report_debug(self, hypothesis_id, msg, data=None):
        payload = {
            "sessionId": DEBUG_SESSION_ID,
            "runId": "pre-fix",
            "hypothesisId": hypothesis_id,
            "location": "eeg_bridge.py",
            "msg": f"[DEBUG] {msg}",
            "data": data or {},
            "ts": int(time.time() * 1000),
        }
        try:
            urllib.request.urlopen(
                urllib.request.Request(
                    DEBUG_SERVER_URL,
                    data=json.dumps(payload).encode(),
                    headers={"Content-Type": "application/json"},
                ),
                timeout=1,
            ).read()
        except Exception:
            pass
    # #endregion

    async def start(self):
        self.loop = asyncio.get_running_loop()
        server = await self.start_ws_server()
        if not server:
            self.log("WebSocket server failed to start")
            return

        threading.Thread(target=self.serial_worker, daemon=True).start()

        await self.queue_sender()
        await server.wait_closed()

    async def start_ws_server(self):
        for port in (8765, 8766):
            try:
                server = await websockets.serve(self.ws_handler, "127.0.0.1", port)
                self.log(f"WebSocket server started on ws://localhost:{port}")
                return server
            except OSError as e:
                self.log(f"WebSocket bind failed on {port}: {e}")
        return None

    async def ws_handler(self, websocket):
        self.clients.add(websocket)
        # #region debug-point B:ws-client-connected
        self.report_debug("B", "bridge websocket client connected", {"client_count": len(self.clients)})
        # #endregion
        await websocket.send(json.dumps({"type": "status", "message": "Bridge Connected. Choose EEG Equipment to start."}))
        if self.last_status_message:
            await websocket.send(json.dumps({"type": "status", "message": self.last_status_message}))
        try:
            async for raw_message in websocket:
                try:
                    message = json.loads(raw_message)
                except Exception:
                    continue

                action = message.get("action")
                if action == "start_eeg":
                    # #region debug-point B:start-eeg-received
                    self.report_debug("B", "bridge received start_eeg action", {"raw_message": message})
                    # #endregion
                    self.permission_blocked = False
                    self.reset_state()
                    self.close_serial()
                    self.capture_enabled = True
                    self.enqueue_status("Searching for paired MindWave serial port...", force=True)
                elif action == "stop_eeg":
                    # #region debug-point B:stop-eeg-received
                    self.report_debug("B", "bridge received stop_eeg action", {"raw_message": message})
                    # #endregion
                    self.permission_blocked = False
                    self.capture_enabled = False
                    self.reset_state()
                    self.close_serial()
                    self.enqueue_status("EEG idle. Waiting for user to choose EEG Equipment.", force=True)
        finally:
            self.clients.discard(websocket)
            if not self.clients:
                self.capture_enabled = False
                self.reset_state()
                self.close_serial()

    async def queue_sender(self):
        while self.running:
            payload = await self.queue.get()
            if not self.clients:
                continue

            data = json.dumps(payload)
            dead = []
            for ws in self.clients:
                try:
                    await ws.send(data)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.clients.discard(ws)

    def enqueue(self, payload):
        if self.loop and self.running:
            self.loop.call_soon_threadsafe(self.queue.put_nowait, payload)

    def enqueue_status(self, msg, force=False):
        if not force and msg == self.last_status_message:
            return
        self.last_status_message = msg
        self.log(msg)
        self.enqueue({"type": "status", "message": msg})

    def emit_sense(self):
        self.enqueue(
            {
                "type": "sense",
                "attention": int(self.attention or 0),
                "meditation": int(self.meditation or 0),
                "signal_quality": float(self.signal_quality or 0),
            }
        )

    def reset_state(self):
        self.attention = 0
        self.meditation = 0
        self.signal_quality = 0
        self.last_data_time = 0

    def find_paired_mindwave_port(self):
        preferred = []
        fallback = []

        for port in list_ports.comports():
            device = (port.device or "").lower()
            description = (port.description or "").lower()
            text = f"{device} {description}"

            if "mindwave" in text or "neurosky" in text:
                preferred.append(port.device)
            elif device.startswith("/dev/cu.") and "incoming-port" not in text and "debug-console" not in text:
                fallback.append(port.device)

        if preferred:
            port = preferred[0]
            tty_port = port.replace("/dev/cu.", "/dev/tty.", 1)
            if port.startswith("/dev/cu.") and os.path.exists(tty_port):
                return tty_port
            return port
        if fallback:
            port = fallback[0]
            tty_port = port.replace("/dev/cu.", "/dev/tty.", 1)
            if port.startswith("/dev/cu.") and os.path.exists(tty_port):
                return tty_port
            return port
        return None

    def serial_worker(self):
        while self.running:
            if not self.capture_enabled:
                time.sleep(0.2)
                continue

            if self.permission_blocked:
                time.sleep(0.2)
                continue

            port = self.find_paired_mindwave_port()
            if not port:
                # #region debug-point E:no-port-found
                self.report_debug("E", "bridge could not find paired mindwave port", {})
                # #endregion
                self.enqueue_status("MindWave not found. Please pair the headset in macOS Bluetooth first.")
                time.sleep(PORT_RETRY_SECONDS)
                continue

            try:
                self.current_port = port
                # #region debug-point C:serial-open-attempt
                self.report_debug("C", "bridge opening serial port", {"port": port, "capture_enabled": self.capture_enabled})
                # #endregion
                self.enqueue_status(f"Opening paired MindWave serial port: {port}", force=True)
                self.serial_conn = serial.Serial(port, BAUD_RATE, timeout=1)
                # #region debug-point C:serial-open-success
                self.report_debug("C", "bridge serial port opened", {"port": port})
                # #endregion
                self.enqueue_status(f"MindWave serial connected: {port}", force=True)
                self.read_serial_stream()
            except Exception as e:
                err_text = str(e)
                # #region debug-point E:serial-open-failed
                self.report_debug("E", "bridge serial open failed", {"port": port, "message": err_text})
                # #endregion
                if "Operation not permitted" in err_text:
                    self.permission_blocked = True
                    self.capture_enabled = False
                    self.enqueue_status(
                        "Port access denied. Start the launcher from your own macOS Terminal or grant Bluetooth/serial access to the running app.",
                        force=True,
                    )
                else:
                    self.enqueue_status(f"Serial connection error on {port}: {e}", force=True)
                time.sleep(PORT_RETRY_SECONDS)
            finally:
                self.close_serial()

    def close_serial(self):
        if self.serial_conn:
            try:
                self.serial_conn.close()
            except Exception:
                pass
        self.serial_conn = None
        self.current_port = None

    def read_serial_stream(self):
        buffer = bytearray()

        while self.running and self.capture_enabled and self.serial_conn and self.serial_conn.is_open:
            try:
                chunk = self.serial_conn.read(256)
            except Exception as e:
                err_text = str(e)
                # #region debug-point D:serial-read-ended
                self.report_debug("D", "bridge serial read loop ended", {
                    "port": self.current_port,
                    "capture_enabled": self.capture_enabled,
                    "client_count": len(self.clients),
                    "message": err_text,
                })
                # #endregion
                if self.capture_enabled and "Bad file descriptor" not in err_text:
                    self.enqueue_status(f"Serial connection error on {self.current_port}: {e}", force=True)
                break
            if chunk:
                if self.last_data_time == 0:
                    # #region debug-point D:first-serial-bytes
                    self.report_debug("D", "bridge received first serial bytes", {
                        "port": self.current_port,
                        "byte_count": len(chunk),
                        "hex_preview": chunk[:16].hex(),
                    })
                    # #endregion
                buffer.extend(chunk)
                self.process_buffer(buffer)
            else:
                now = time.time()
                if now - self.last_data_time > NO_DATA_WARN_SECONDS and now - self.last_no_data_warning_at > NO_DATA_WARN_SECONDS:
                    self.last_no_data_warning_at = now
                    self.enqueue_status("MindWave connected but no EEG data yet. Check power and sensor contact.")

    def process_buffer(self, buffer):
        while len(buffer) >= 4:
            if buffer[0] != 0xAA or buffer[1] != 0xAA:
                buffer.pop(0)
                continue

            payload_len = buffer[2]
            if payload_len > 169:
                buffer.pop(0)
                continue

            packet_len = 3 + payload_len + 1
            if len(buffer) < packet_len:
                return

            payload = bytes(buffer[3 : 3 + payload_len])
            checksum = buffer[3 + payload_len]
            expected = (~sum(payload)) & 0xFF

            del buffer[:packet_len]

            if checksum != expected:
                continue

            self.parse_payload(payload)

    def parse_payload(self, payload):
        idx = 0
        updated = False

        while idx < len(payload):
            code = payload[idx]
            idx += 1

            if code == 0x02 and idx < len(payload):
                raw_signal = payload[idx]
                idx += 1
                self.signal_quality = max(0, min(100, (200 - raw_signal) / 2))
                updated = True
            elif code == 0x04 and idx < len(payload):
                self.attention = payload[idx]
                idx += 1
                updated = True
            elif code == 0x05 and idx < len(payload):
                self.meditation = payload[idx]
                idx += 1
                updated = True
            elif code >= 0x80 and idx < len(payload):
                value_len = payload[idx]
                idx += 1 + value_len
            else:
                idx += 1

        if updated:
            self.last_data_time = time.time()
            self.emit_sense()

if __name__ == "__main__":
    bridge = EEGBridge()
    try:
        asyncio.run(bridge.start())
    except KeyboardInterrupt:
        bridge.running = False
