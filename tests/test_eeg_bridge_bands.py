"""Parser tests for the 0x83 (ASIC_EEG_POWER) addition in eeg_bridge.py.

Run from the repo root:  python3 tests/test_eeg_bridge_bands.py

No headset, serial port or network is needed: the tests feed hand-built
ThinkGear bytes straight into the parser. pyserial / websockets are stubbed
when they are not installed, so this also runs on a machine without them.
"""
import os
import sys
import types
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

try:
    import serial  # noqa: F401
except ImportError:
    serial_stub = types.ModuleType("serial")
    serial_stub.Serial = object
    serial_stub.SerialException = Exception
    tools_stub = types.ModuleType("serial.tools")
    ports_stub = types.ModuleType("serial.tools.list_ports")
    ports_stub.comports = lambda: []
    tools_stub.list_ports = ports_stub
    serial_stub.tools = tools_stub
    sys.modules["serial"] = serial_stub
    sys.modules["serial.tools"] = tools_stub
    sys.modules["serial.tools.list_ports"] = ports_stub

try:
    import websockets  # noqa: F401
except ImportError:
    sys.modules["websockets"] = types.ModuleType("websockets")

import eeg_bridge  # noqa: E402

BAND_ORDER = ["delta", "theta", "lowAlpha", "highAlpha", "lowBeta", "highBeta", "lowGamma", "midGamma"]


def band_row(values):
    """0x83 row: code, length 24, then eight 3-byte big-endian values."""
    row = bytearray([0x83, 24])
    for value in values:
        row += value.to_bytes(3, "big")
    return bytes(row)


def packet(payload):
    """Wrap a payload as a full ThinkGear packet: AA AA len payload checksum."""
    checksum = (~sum(payload)) & 0xFF
    return bytes([0xAA, 0xAA, len(payload)]) + bytes(payload) + bytes([checksum])


class RecordingBridge(eeg_bridge.EEGBridge):
    """Collects what would be broadcast instead of needing an event loop."""

    def __init__(self):
        super().__init__()
        self.sent = []

    def enqueue(self, payload):
        self.sent.append(payload)


class BandParsingTest(unittest.TestCase):
    def test_bands_are_read_big_endian_in_order(self):
        values = [0x010203, 0x0A0B0C, 1, 255, 256, 65536, 0xFFFFFF, 0]
        bridge = RecordingBridge()
        payload = bytes([0x02, 0]) + band_row(values) + bytes([0x04, 57, 0x05, 43])
        bridge.process_buffer(bytearray(packet(payload)))

        self.assertEqual(len(bridge.sent), 1)
        message = bridge.sent[0]
        self.assertEqual(list(message["bands"].keys()), BAND_ORDER)
        self.assertEqual(list(message["bands"].values()), values)
        # 0x010203 big-endian is 66051; little-endian would be 197121.
        self.assertEqual(message["bands"]["delta"], 66051)

    def test_old_fields_are_unchanged(self):
        bridge = RecordingBridge()
        payload = bytes([0x02, 50]) + band_row([10] * 8) + bytes([0x04, 61, 0x05, 38])
        bridge.process_buffer(bytearray(packet(payload)))

        message = bridge.sent[0]
        self.assertEqual(message["type"], "sense")
        self.assertEqual(message["attention"], 61)
        self.assertEqual(message["meditation"], 38)
        self.assertEqual(message["signal_quality"], 75.0)  # (200 - 50) / 2
        # Exactly the old keys plus the one new one.
        self.assertEqual(
            set(message.keys()),
            {"type", "attention", "meditation", "signal_quality", "bands"},
        )

    def test_packet_without_bands_sends_none(self):
        bridge = RecordingBridge()
        bridge.process_buffer(bytearray(packet(bytes([0x02, 0, 0x04, 40, 0x05, 40]))))
        self.assertIsNone(bridge.sent[0]["bands"])

    def test_bands_do_not_go_stale(self):
        bridge = RecordingBridge()
        with_bands = bytes([0x02, 0]) + band_row([5] * 8) + bytes([0x04, 50, 0x05, 50])
        without = bytes([0x02, 0, 0x04, 51, 0x05, 49])
        bridge.process_buffer(bytearray(packet(with_bands) + packet(without)))
        self.assertEqual(bridge.sent[0]["bands"]["theta"], 5)
        self.assertIsNone(bridge.sent[1]["bands"])

    def test_raw_wave_packets_still_send_nothing(self):
        # 0x80 raw-wave rows arrive 512 times a second and must stay silent.
        bridge = RecordingBridge()
        bridge.process_buffer(bytearray(packet(bytes([0x80, 2, 0x01, 0x02]))))
        self.assertEqual(bridge.sent, [])

    def test_band_row_alone_does_not_trigger_a_message(self):
        # Same rule as before the change: only 0x02 / 0x04 / 0x05 emit.
        bridge = RecordingBridge()
        bridge.process_buffer(bytearray(packet(band_row([1] * 8))))
        self.assertEqual(bridge.sent, [])

    def test_wrong_length_row_is_skipped_like_any_other_extended_code(self):
        bridge = RecordingBridge()
        payload = bytes([0x83, 3, 9, 9, 9, 0x04, 44])
        bridge.process_buffer(bytearray(packet(payload)))
        self.assertEqual(bridge.sent[0]["attention"], 44)
        self.assertIsNone(bridge.sent[0]["bands"])

    def test_truncated_band_row_does_not_crash(self):
        bridge = RecordingBridge()
        payload = bytes([0x04, 30, 0x83, 24, 1, 2, 3])
        bridge.process_buffer(bytearray(packet(payload)))
        self.assertEqual(bridge.sent[0]["attention"], 30)
        self.assertIsNone(bridge.sent[0]["bands"])

    def test_bad_checksum_is_dropped(self):
        bridge = RecordingBridge()
        data = bytearray(packet(bytes([0x02, 0]) + band_row([1] * 8) + bytes([0x04, 50])))
        data[-1] ^= 0xFF
        bridge.process_buffer(data)
        self.assertEqual(bridge.sent, [])

    def test_message_is_json_serialisable(self):
        import json

        bridge = RecordingBridge()
        payload = bytes([0x02, 0]) + band_row(list(range(8))) + bytes([0x04, 50])
        bridge.process_buffer(bytearray(packet(payload)))
        decoded = json.loads(json.dumps(bridge.sent[0]))
        self.assertEqual(decoded["bands"]["midGamma"], 7)


if __name__ == "__main__":
    unittest.main(verbosity=2)
