"""Detached launcher for Yojana Sahayak frontend on Windows.

Uses DETACHED_PROCESS and CREATE_NEW_PROCESS_GROUP so it remains running
independependently without receiving console CTRL_C signals from tool subshells.
"""

import os
import sys
import subprocess
from pathlib import Path

workspace_root = Path(__file__).resolve().parent.parent
web_dir = workspace_root / "apps" / "web"

DETACHED_FLAGS = 0x00000008 | 0x00000200

stdout_log = workspace_root / "data" / "frontend_server.log"
stdout_log.parent.mkdir(parents=True, exist_ok=True)

log_file = open(stdout_log, "a", encoding="utf-8")

# Run vite using node directly from node_modules
vite_bin = web_dir / "node_modules" / "vite" / "bin" / "vite.js"

proc = subprocess.Popen(
    [
        "node",
        str(vite_bin),
        "--host",
        "127.0.0.1",
        "--port",
        "5173"
    ],
    cwd=str(web_dir),
    creationflags=DETACHED_FLAGS,
    stdout=log_file,
    stderr=subprocess.STDOUT
)

pid_file = workspace_root / "data" / "frontend.pid"
pid_file.write_text(str(proc.pid), encoding="utf-8")
print(f"Started detached Yojana Sahayak frontend with PID: {proc.pid} on port 5173")

