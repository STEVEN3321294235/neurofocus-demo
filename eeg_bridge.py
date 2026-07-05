import asyncio
import json
import os
import socket
import threading
import time

import serial
import websockets
from serial.tools import list_ports


BAUD_RATE = 57600
PORT_RETRY_SECONDS = 3
NO_DATA_WARN_SECONDS = 5


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

    def get_access_urls(self, port):
        urls = [f"ws://127.0.0.1:{port}", f"ws://localhost:{port}"]
        try:
            hostname = socket.gethostname()
            for info in socket.getaddrinfo(hostname, None, family=socket.AF_INET):
                ip = info[4][0]
                if ip and not ip.startswith("127."):
                    urls.append(f"ws://{ip}:{port}")
        except Exception:
            pass
        return list(dict.fromkeys(urls))


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
                server = await websockets.serve(self.ws_handler, "0.0.0.0", port)
                urls = self.get_access_urls(port)
                self.log(f"WebSocket server started on {urls[0]}")
                if len(urls) > 1:
                    self.log(f"Additional bridge URLs: {', '.join(urls[1:])}")
                return server
            except OSError as e:
                self.log(f"WebSocket bind failed on {port}: {e}")
        return None

    async def ws_handler(self, websocket):
        self.clients.add(websocket)
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
                    self.permission_blocked = False
                    self.reset_state()
                    self.close_serial()
                    self.capture_enabled = True
                    self.enqueue_status("Searching for paired MindWave serial port...", force=True)
                elif action == "stop_eeg":
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

    def get_candidate_ports(self):
        preferred = []
        fallback = []

        for port in list_ports.comports():
            device = (port.device or "")
            description = (port.description or "").lower()
            text = f"{device.lower()} {description}"

            if "mindwave" in text or "neurosky" in text:
                preferred.append(device)
            elif device.startswith("/dev/cu.") and "incoming-port" not in text and "debug-console" not in text:
                fallback.append(device)
            elif device.upper().startswith("COM"):
                # Windows COM ports fallback
                fallback.append(device)

        candidates = []

        if preferred:
            for port in preferred:
                if port.startswith("/dev/cu."):
                    tty_port = port.replace("/dev/cu.", "/dev/tty.", 1)
                    if os.path.exists(tty_port):
                        candidates.append(tty_port)
                candidates.append(port)

        if fallback:
            windows_ports = [p for p in fallback if p.upper().startswith("COM")]
            other_ports = [p for p in fallback if p not in windows_ports]

            # On Windows, newly paired SPP devices are often the newest / highest COM numbers.
            for port in reversed(windows_ports):
                candidates.append(port)

            for port in other_ports:
                if port.startswith("/dev/cu."):
                    tty_port = port.replace("/dev/cu.", "/dev/tty.", 1)
                    if os.path.exists(tty_port):
                        candidates.append(tty_port)
                candidates.append(port)

        deduped = []
        seen = set()
        for port in candidates:
            if not port or port in seen:
                continue
            seen.add(port)
            deduped.append(port)
        return deduped

    def find_paired_mindwave_port(self):
        candidates = self.get_candidate_ports()
        return candidates[0] if candidates else None

    def serial_worker(self):
        while self.running:
            if not self.capture_enabled:
                time.sleep(0.2)
                continue

            if self.permission_blocked:
                time.sleep(0.2)
                continue

            candidate_ports = self.get_candidate_ports()
            if not candidate_ports:
                self.enqueue_status("MindWave not found. Please pair the headset in Bluetooth settings first.")
                time.sleep(PORT_RETRY_SECONDS)
                continue

            opened = False
            last_error = None

            for port in candidate_ports:
                try:
                    self.current_port = port
                    self.enqueue_status(f"Trying MindWave serial port: {port}", force=True)
                    self.serial_conn = serial.Serial(port, BAUD_RATE, timeout=1)
                    self.enqueue_status(f"MindWave serial connected: {port}", force=True)
                    opened = True
                    self.read_serial_stream()
                    break
                except Exception as e:
                    err_text = str(e)
                    last_error = (port, err_text)
                    if "Operation not permitted" in err_text:
                        self.permission_blocked = True
                        self.capture_enabled = False
                        self.enqueue_status(
                            "Port access denied. Reopen the launcher with device access permission, or grant Bluetooth/serial permission to the running app.",
                            force=True,
                        )
                        break
                    self.close_serial()
                    continue
                finally:
                    if not opened:
                        self.close_serial()

            if not opened and self.capture_enabled and not self.permission_blocked:
                if last_error:
                    self.enqueue_status(f"Serial connection error on {last_error[0]}: {last_error[1]}", force=True)
                time.sleep(PORT_RETRY_SECONDS)
            else:
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
                if self.capture_enabled and "Bad file descriptor" not in err_text:
                    self.enqueue_status(f"Serial connection error on {self.current_port}: {e}", force=True)
                break
            if chunk:
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
