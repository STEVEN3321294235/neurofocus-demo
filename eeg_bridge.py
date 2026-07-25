import asyncio
import json
import os
import re
import socket
import sys
import threading
import time

import serial
import websockets
from serial.tools import list_ports


BAUD_RATE = 57600
PORT_RETRY_SECONDS = 3
NO_DATA_WARN_SECONDS = 5

# Pairing a MindWave on Windows creates TWO COM ports (an outgoing and an
# incoming one) and only the outgoing one ever streams. Opening the wrong one
# SUCCEEDS and then stays silent forever, which used to look exactly like a flat
# battery or bad sensor contact. So a port that produces no valid packet within
# this window is treated as the wrong port and the scan moves on to the next
# candidate instead of waiting there.
NO_DATA_PORT_TIMEOUT_SECONDS = 12

# Escape hatch when the scan still guesses wrong. Either way works:
#   start_eeg_bridge_windows.bat COM5      <- simplest, survives double-clicking
#   set NEUROFOCUS_EEG_PORT=COM5           <- must be the SAME cmd window as the
#                                             launcher, which is easy to get wrong
FORCED_PORT = (
    (sys.argv[1] if len(sys.argv) > 1 else "")
    or os.environ.get("NEUROFOCUS_EEG_PORT")
    or ""
).strip()

# WinError 121 (semaphore timeout) and 233 (no process on the other end of the
# pipe) when OPENING a port are not "wrong port" errors — they mean Windows did
# reach a Bluetooth outgoing port and the headset did not answer. That is the
# strongest hint available about which COM port actually belongs to the MindWave,
# so the port that produced them is remembered and retried first.
BT_NOT_ANSWERING = re.compile(r"None,\s*(121|233)\)")


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
        # COM port that answered like a Bluetooth device (WinError 121/233).
        self.bt_port_hint = None

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
        # An explicit override is used EXCLUSIVELY and retried patiently. The
        # MindWave's own outgoing port often refuses to open for a while (the
        # Bluetooth link is established at open time, so a headset that is off,
        # asleep or low on battery surfaces as WinError 121 "semaphore timeout"
        # or 233 "no process on the other end"). Rotating away from it in that
        # window only thrashes the Bluetooth stack, so once the operator names
        # the port we keep knocking on that door.
        if FORCED_PORT:
            return [FORCED_PORT]

        # A port that timed out like a Bluetooth device is the best guess we
        # have; keep retrying it first instead of rediscovering it every cycle.
        preferred = [self.bt_port_hint] if self.bt_port_hint else []
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
                    if self.read_serial_stream():
                        # Real EEG packets arrived: this is the right port.
                        break
                    if not self.capture_enabled or not self.running:
                        break
                    # Opened fine but never streamed — almost always the paired
                    # device's other (incoming) COM port. Move on rather than
                    # sitting here blaming the headset.
                    self.enqueue_status(
                        f"No EEG data on {port} after {NO_DATA_PORT_TIMEOUT_SECONDS}s - trying the next port.",
                        force=True,
                    )
                    self.close_serial()
                    opened = False
                    continue
                except Exception as e:
                    err_text = str(e)
                    last_error = (port, err_text)
                    if BT_NOT_ANSWERING.search(err_text):
                        # Found the headset's port; the headset just is not
                        # answering. Say so plainly — this used to read like a
                        # generic serial failure and sent us port-hunting.
                        self.bt_port_hint = port
                        self.enqueue_status(
                            f"{port} is the MindWave's Bluetooth port but the headset is not answering. "
                            f"Switch the headset OFF then ON now - the bridge keeps retrying {port}.",
                            force=True,
                        )
                        self.close_serial()
                        continue
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
        """Stream from the open port. Returns True once real EEG packets were
        decoded, or False if the port stayed silent long enough to be judged the
        wrong one (see NO_DATA_PORT_TIMEOUT_SECONDS) so the caller can try the
        next candidate."""
        buffer = bytearray()
        opened_at = time.time()
        got_data = False

        while self.running and self.capture_enabled and self.serial_conn and self.serial_conn.is_open:
            # Checked every pass, because a wrong port can also emit garbage
            # bytes that never decode into a valid packet.
            if not got_data and time.time() - opened_at > NO_DATA_PORT_TIMEOUT_SECONDS:
                return False

            try:
                chunk = self.serial_conn.read(256)
            except Exception as e:
                err_text = str(e)
                if self.capture_enabled and "Bad file descriptor" not in err_text:
                    self.enqueue_status(f"Serial connection error on {self.current_port}: {e}", force=True)
                break
            if chunk:
                buffer.extend(chunk)
                before = self.last_data_time
                self.process_buffer(buffer)
                if self.last_data_time > before:
                    got_data = True
            else:
                now = time.time()
                if got_data and now - self.last_data_time > NO_DATA_WARN_SECONDS and now - self.last_no_data_warning_at > NO_DATA_WARN_SECONDS:
                    # Only meaningful once the port has proven itself: now a
                    # silence really is power / sensor contact.
                    self.last_no_data_warning_at = now
                    self.enqueue_status("MindWave connected but no EEG data yet. Check power and sensor contact.")

        return got_data

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
