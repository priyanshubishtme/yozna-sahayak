"""Detached launcher for Yojana Sahayak backend on Windows.

Uses DETACHED_PROCESS and CREATE_NEW_PROCESS_GROUP so it remains running
independently without receiving console CTRL_C signals from tool subshells.
"""

import os
import sys
import subprocess
from pathlib import Path

workspace_root = Path(__file__).resolve().parent.parent

DETACHED_FLAGS = 0x00000008 | 0x00000200

stdout_log = workspace_root / "data" / "backend_server.log"
stdout_log.parent.mkdir(parents=True, exist_ok=True)

log_file = open(stdout_log, "a", encoding="utf-8")
proc = subprocess.Popen(
    [
        sys.executable,
        "-m",
        "uvicorn",
        "backend.app.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        "8005",
        "--log-level",
        "info"
    ],
    cwd=str(workspace_root),
    creationflags=DETACHED_FLAGS,
    stdout=log_file,
    stderr=subprocess.STDOUT
)

pid_file = workspace_root / "data" / "backend.pid"
pid_file.write_text(str(proc.pid), encoding="utf-8")
print(f"Started detached Yojana Sahayak backend with PID: {proc.pid} on port 8005")
