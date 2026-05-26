#!/usr/bin/env python3
"""
Claude Monitor Trigger Server

Lightweight HTTP server (localhost only) that lets the browser trigger
the ingestion script and check sync status.

Endpoints:
  GET  /health  -> { "ok": true }
  GET  /status  -> { "status", "last_sync_at", "files_processed", "messages_ingested", "process_alive" }
  POST /trigger -> { "triggered": true } or 409 if already running

Usage:
  python3 trigger_server.py              # Default port 7829
  python3 trigger_server.py --port 7830  # Custom port
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import subprocess
import sys
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

from dotenv import load_dotenv

BIND = "127.0.0.1"
DEFAULT_PORT = 7829

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("trigger_server")

load_dotenv(Path(__file__).parent / ".env")

SCRIPT_DIR = Path(__file__).parent
INGEST_SCRIPT = SCRIPT_DIR / "ingest.py"

_sync_lock = threading.Lock()
_sync_running = False
_sync_process: subprocess.Popen | None = None


def _get_allowed_origins() -> list[str]:
    extra = os.getenv("TRIGGER_ALLOWED_ORIGINS", "")
    origins = list(ALLOWED_ORIGINS)
    for o in extra.split(","):
        o = o.strip()
        if o:
            origins.append(o)
    return origins


def _get_supabase_status() -> dict:
    """Read sync_state from Supabase."""
    try:
        from supabase import create_client
        from supabase.lib.client_options import SyncClientOptions

        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY")
        if not url or not key:
            return {}

        client = create_client(url, key, options=SyncClientOptions(schema="claude_monitor"))
        result = client.table("sync_state").select("*").order("id", desc=True).limit(1).execute()
        if result.data:
            row = result.data[0]
            return {
                "last_sync_at": row.get("last_sync_at"),
                "files_processed": row.get("files_processed", 0),
                "messages_ingested": row.get("messages_ingested", 0),
                "db_status": row.get("status", "unknown"),
            }
    except Exception as e:
        log.warning(f"Failed to read sync_state from Supabase: {e}")
    return {}


class TriggerHandler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        log.info(format % args)

    def _set_cors_headers(self) -> None:
        origin = self.headers.get("Origin", "")
        allowed = _get_allowed_origins()
        if origin in allowed:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Vary", "Origin")

    def _send_json(self, status: int, data: dict) -> None:
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self._set_cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self._set_cors_headers()
        self.end_headers()

    def do_GET(self) -> None:
        if self.path == "/health":
            self._send_json(200, {"ok": True})
        elif self.path == "/status":
            self._handle_status()
        else:
            self._send_json(404, {"error": "not_found"})

    def do_POST(self) -> None:
        if self.path == "/trigger":
            self._handle_trigger()
        else:
            self._send_json(404, {"error": "not_found"})

    def _handle_status(self) -> None:
        global _sync_running, _sync_process
        supabase_state = _get_supabase_status()
        process_alive = _sync_process is not None and _sync_process.poll() is None

        status = "running" if _sync_running else supabase_state.get("db_status", "idle")
        self._send_json(200, {
            "status": status,
            "last_sync_at": supabase_state.get("last_sync_at"),
            "files_processed": supabase_state.get("files_processed", 0),
            "messages_ingested": supabase_state.get("messages_ingested", 0),
            "process_alive": process_alive,
        })

    def _handle_trigger(self) -> None:
        global _sync_running, _sync_process

        with _sync_lock:
            if _sync_running:
                self._send_json(409, {"error": "sync_already_running"})
                return
            _sync_running = True

        log.info("Triggering ingestion...")

        def run_ingest() -> None:
            global _sync_running, _sync_process
            try:
                proc = subprocess.Popen(
                    [sys.executable, str(INGEST_SCRIPT)],
                    cwd=str(SCRIPT_DIR),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                )
                _sync_process = proc
                stdout, _ = proc.communicate()
                if stdout:
                    for line in stdout.decode("utf-8", errors="replace").splitlines():
                        log.info(f"[ingest] {line}")
                log.info(f"Ingestion finished with exit code {proc.returncode}")
            except Exception as e:
                log.error(f"Ingestion failed: {e}")
            finally:
                with _sync_lock:
                    _sync_running = False
                    _sync_process = None

        thread = threading.Thread(target=run_ingest, daemon=True)
        thread.start()
        self._send_json(200, {"triggered": True})


def main() -> None:
    parser = argparse.ArgumentParser(description="Claude Monitor Trigger Server")
    parser.add_argument("--port", type=int, default=int(os.getenv("TRIGGER_PORT", str(DEFAULT_PORT))))
    args = parser.parse_args()

    server = HTTPServer((BIND, args.port), TriggerHandler)
    log.info(f"Trigger server listening on {BIND}:{args.port}")
    log.info(f"Allowed origins: {_get_allowed_origins()}")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log.info("Shutting down...")
        server.shutdown()


if __name__ == "__main__":
    main()
