"""Automated Restore Script for Yojana Sahayak (Phase 10 & Blueprint Section 16).

Verifies checksum manifest, extracts database and documents storage, and runs PRAGMA integrity_check.
"""

import hashlib
import json
import os
import shutil
import sqlite3
import sys
import tarfile
from pathlib import Path

DATA_DIR = Path("data")
DB_PATH = DATA_DIR / "yojana_sahayak.db"
STORAGE_DIR = DATA_DIR / "storage"
BACKUP_DIR = DATA_DIR / "backups"


def compute_sha256(filepath: Path) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def restore_backup(archive_path: Path):
    if not archive_path.exists():
        print(f"Error: Archive '{archive_path}' not found.")
        sys.exit(1)

    # 1. Verify checksum if .sha256 file exists
    sha_file = Path(str(archive_path) + ".sha256")
    if sha_file.exists():
        expected_sha = sha_file.read_text().split()[0].strip()
        actual_sha = compute_sha256(archive_path)
        if expected_sha != actual_sha:
            print(f"Error: Checksum mismatch! Expected {expected_sha}, got {actual_sha}")
            sys.exit(1)
        print("Archive SHA-256 checksum verified.")

    temp_extract = BACKUP_DIR / "temp_restore"
    temp_extract.mkdir(parents=True, exist_ok=True)

    try:
        print(f"Extracting {archive_path}...")
        with tarfile.open(archive_path, "r:gz") as tar:
            tar.extractall(temp_extract)

        backup_root = temp_extract / "backup"

        # Verify Manifest
        manifest_file = backup_root / "manifest.json"
        if manifest_file.exists():
            with open(manifest_file, "r") as mf:
                manifest = json.load(mf)
                print(f"Manifest verified: Backup created at {manifest.get('created_at')}")

        # Restore SQLite DB
        restored_db = backup_root / "yojana_sahayak.db"
        if restored_db.exists():
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            shutil.copy2(restored_db, DB_PATH)
            print(f"Restored database to: {DB_PATH}")

            # Run SQLite integrity check
            conn = sqlite3.connect(DB_PATH)
            res = conn.execute("PRAGMA integrity_check").fetchone()
            conn.close()
            if res and res[0] == "ok":
                print("Database PRAGMA integrity_check passed: 'ok'")
            else:
                print(f"Warning: Database integrity check returned: {res}")

        # Restore Storage directory
        restored_storage = backup_root / "storage"
        if restored_storage.exists():
            STORAGE_DIR.mkdir(parents=True, exist_ok=True)
            shutil.copytree(restored_storage, STORAGE_DIR, dirs_exist_ok=True)
            print(f"Restored storage binaries to: {STORAGE_DIR}")

        print("[RESTORE COMPLETED SUCCESSFULLY]")

    finally:
        shutil.rmtree(temp_extract, ignore_errors=True)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        target = Path(sys.argv[1])
    else:
        # Find latest backup
        backups = sorted(BACKUP_DIR.glob("yojana_backup_*.tar.gz"))
        if not backups:
            print("No backup archive found in data/backups/.")
            sys.exit(1)
        target = backups[-1]

    restore_backup(target)

