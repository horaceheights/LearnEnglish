#!/usr/bin/env python3
"""Launch the browser-based conversational challenge with microphone speech input and audio playback.

Usage:
    python scripts/launch_conversation_web.py
"""

from __future__ import annotations

import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

PROJECT_ROOT = Path(__file__).resolve().parents[1]
PORT = 8000
URL = f"http://127.0.0.1:{PORT}/conversation"
HEALTH_URL = f"http://127.0.0.1:{PORT}/api/health"


def is_server_running() -> bool:
    try:
        with urllib.request.urlopen(HEALTH_URL, timeout=1.5) as resp:
            return resp.status == 200
    except urllib.error.HTTPError:
        return True
    except Exception:
        return False


def main() -> None:
    print("\n" + "=" * 65)
    print("  * SPANGLISH CONVERSATIONAL CHALLENGE - BROWSER TEST BENCH *")
    print("=" * 65)

    server_process = None

    if is_server_running():
        print(f"✓ FastAPI backend is already running on port {PORT}.")
    else:
        print(f"Starting local backend server on port {PORT}...")
        env = os.environ.copy()
        env["PYTHONPATH"] = str(PROJECT_ROOT)
        server_process = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", str(PORT)],
            cwd=str(PROJECT_ROOT),
            env=env,
        )

        # Wait for server to become responsive
        started = False
        for _ in range(30):
            time.sleep(0.5)
            if is_server_running():
                started = True
                break

        if not started:
            print("[Error] Failed to start backend server. Please check logs.")
            if server_process:
                server_process.kill()
            sys.exit(1)
        print("[Ready] Backend server started successfully.")

    print(f"\nOpening browser at: {URL}\n")
    print("  [Mic]   Click the glowing microphone button in Chrome or Edge to speak English!")
    print("  [Audio] Liam will reply and speak back with high-quality voice audio.")
    print("  [Goals] Watch your 3 Unit 1 communicative objectives check off in real-time.")
    print("\n(Press Ctrl+C in this terminal when you want to stop the server)\n")

    webbrowser.open(URL)

    if server_process:
        try:
            server_process.wait()
        except KeyboardInterrupt:
            print("\nShutting down backend server...")
            server_process.terminate()
            server_process.wait()
            print("Server stopped. See you next time!")


if __name__ == "__main__":
    main()
