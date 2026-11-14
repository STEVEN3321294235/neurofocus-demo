"""Fake MindWave for testing the bridge WITHOUT a headband.  TEST ONLY.

!!! Never run this while collecting real data. The numbers it sends are made
!!! up, but they travel through the real bridge and look like a real headband
!!! to the website (the results will NOT be tagged as a rehearsal).

What it does: opens a pseudo serial port and writes genuine ThinkGear packets
to it once a second (signal, the eight 0x83 band powers, attention,
meditation), so eeg_bridge.py can be tested end to end on a machine with no
Bluetooth. Linux / macOS only (it needs a pty).

Use:
    python3 tests/fake_headset.py            # prints the port, e.g. /dev/pts/3
    python3 eeg_bridge.py /dev/pts/3         # in a second terminal
    python3 serve_local.py                   # in a third; then pick the headband

Options:
    --pattern good     steady good signal (default)
    --pattern patchy   10 s good, then 10 s weak, repeating: about half of any
                       90-second test has good signal, so the results page must
                       say the brainwave result is not counted
    --no-bands         leave out the 0x83 row (what an old headset stream
                       without band data would look like)
"""
import argparse
import math
import os
import pty
import random
import sys
import time
import tty


def packet(payload):
    checksum = (~sum(payload)) & 0xFF
    return bytes([0xAA, 0xAA, len(payload)]) + bytes(payload) + bytes([checksum])


def band_row(values):
    row = bytearray([0x83, 24])
    for value in values:
        row += int(max(0, min(0xFFFFFF, value))).to_bytes(3, "big")
    return bytes(row)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--pattern", choices=["good", "patchy"], default="good")
    parser.add_argument("--no-bands", action="store_true")
    parser.add_argument("--seed", type=int, default=7)
    args = parser.parse_args()

    master, slave = pty.openpty()
    tty.setraw(slave)
    port = os.ttyname(slave)
    print(port, flush=True)
    print("FAKE HEADSET - test only, numbers are made up.", file=sys.stderr, flush=True)
    os.set_blocking(master, False)

    rng = random.Random(args.seed)
    second = 0
    while True:
        second += 1
        weak = args.pattern == "patchy" and (second // 10) % 2 == 1
        poor_signal = 120 if weak else 0          # bridge quality: 40% vs 100%
        attention = 0 if weak else int(max(1, min(100, 58 + 14 * math.sin(second / 9) + rng.uniform(-6, 6))))
        meditation = 0 if weak else int(max(1, min(100, 52 + 10 * math.cos(second / 11) + rng.uniform(-5, 5))))
        payload = bytearray([0x02, poor_signal])
        if not args.no_bands:
            payload += band_row([
                rng.uniform(200000, 900000),   # delta
                rng.uniform(40000, 160000),    # theta
                rng.uniform(15000, 60000),     # lowAlpha
                rng.uniform(12000, 50000),     # highAlpha
                rng.uniform(8000, 40000),      # lowBeta
                rng.uniform(6000, 30000),      # highBeta
                rng.uniform(3000, 15000),      # lowGamma
                rng.uniform(2000, 9000),       # midGamma
            ])
        payload += bytes([0x04, attention, 0x05, meditation])
        try:
            os.write(master, packet(payload))
            # Drain anything the bridge wrote so the pty buffer never fills.
            try:
                os.read(master, 4096)
            except (BlockingIOError, OSError):
                pass
        except BlockingIOError:
            pass
        time.sleep(1.0)


if __name__ == "__main__":
    main()
