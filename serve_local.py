"""Local static server for the NeuroFocus booth machine — Python only, no Node.

Why this exists: the booth Windows laptop already needs Python for
eeg_bridge.py, but not every machine has Node.js installed (and installing it
on competition day is not an option). This serves the exact same files
server.js would, so `http://localhost:8000/#home` works either way.

Run:  python serve_local.py          (or: py serve_local.py)
Then: http://localhost:8000/#home

Note on MIME types: Python's stdlib reads .js from the Windows registry, where
it is sometimes registered as text/plain. Browsers refuse to execute ES modules
served as text/plain, which would break the whole app — so the important types
are pinned explicitly below instead of trusting the registry.
"""

import http.server
import os
import socketserver
import sys

PORT = int(os.environ.get("PORT", "8000"))
ROOT = os.path.dirname(os.path.abspath(__file__))

TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".ico": "image/x-icon",
    ".mp3": "audio/mpeg",
    ".glb": "model/gltf-binary",
    ".hdr": "application/octet-stream",
    ".bin": "application/octet-stream",
    ".wasm": "application/wasm",
    ".task": "application/octet-stream",
    ".woff2": "font/woff2",
    ".woff": "font/woff",
    ".ttf": "font/ttf",
}

NO_CACHE = {".html", ".js", ".mjs", ".css", ".json"}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def guess_type(self, path):
        ext = os.path.splitext(path)[1].lower()
        return TYPES.get(ext, super().guess_type(path))

    def end_headers(self):
        ext = os.path.splitext(self.path.split("?")[0])[1].lower()
        if ext in NO_CACHE:
            # Code must never come from a stale cache mid-demo.
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        else:
            # Big assets (3D model, wasm, fonts) are safe to cache for a session.
            self.send_header("Cache-Control", "public, max-age=3600")
        super().end_headers()

    def log_message(self, fmt, *args):
        # Keep the console readable: only report problems, not every 200.
        if args and str(args[1]).startswith(("4", "5")):
            sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    os.chdir(ROOT)
    try:
        with Server(("0.0.0.0", PORT), Handler) as httpd:
            print("=" * 46)
            print("NeuroFocus local site running")
            print("  http://localhost:%d/#home" % PORT)
            print("Press Ctrl+C to stop.")
            print("=" * 46, flush=True)
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    except OSError as exc:
        print("Could not start on port %d: %s" % (PORT, exc))
        print("Another program may already be using it. Close it, or run:")
        print("  set PORT=8080 && python serve_local.py")
