"""Production and development runner for Yojana Sahayak backend."""
import os
import sys
from pathlib import Path

# Ensure workspace root is at index 0 of sys.path
workspace_root = str(Path(__file__).resolve().parent.parent)
if workspace_root not in sys.path:
    sys.path.insert(0, workspace_root)

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "backend.app.main:app",
        host="127.0.0.1",
        port=8000,
        log_level="info",
        access_log=True,
    )
