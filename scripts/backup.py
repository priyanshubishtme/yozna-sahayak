"""Automated Backup Script for Yojana Sahayak (Phase 10 & Blueprint Section 16).

Creates atomic SQLite online backup and documents storage archive with SHA-256 integrity manifest.
"""

import hashlib
import json
import os
import shutil
import sqlite3
import sys
import tarfile
from datetime import datetime, timezone
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


def create_backup():
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    temp_dir = BACKUP_DIR / f"temp_{timestamp}"
    temp_dir.mkdir(parents=True, exist_ok=True)

    try:
        # 1. Atomic SQLite backup using online backup API
        temp_db = temp_dir / "yojana_sahayak.db"
        if DB_PATH.exists():
            print(f"Backing up database: {DB_PATH} -> {temp_db}")
            src_conn = sqlite3.connect(DB_PATH)
            dst_conn = sqlite3.connect(temp_db)
            src_conn.backup(dst_conn)
            dst_conn.close()
            src_conn.close()
        else:
            print("Warning: Database file does not exist yet.")

        # 2. Copy storage binaries
        temp_storage = temp_dir / "storage"
        if STORAGE_DIR.exists():
            print(f"Backing up storage directory: {STORAGE_DIR}")
            shutil.copytree(STORAGE_DIR, temp_storage, dirs_exist_ok=True)

        # 3. Generate Manifest
        manifest = {
            "timestamp": timestamp,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "database_sha256": compute_sha256(temp_db) if temp_db.exists() else None,
            "files_backed_up": len(list(temp_dir.rglob("*")))
        }
        with open(temp_dir / "manifest.json", "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)

        # 4. Tar.gz compression
        archive_name = BACKUP_DIR / f"yojana_backup_{timestamp}.tar.gz"
        print(f"Creating compressed archive: {archive_name}")
        with tarfile.open(archive_name, "w:gz") as tar:
            tar.add(temp_dir, arcname="backup")

        archive_sha = compute_sha256(archive_name)
        with open(str(archive_name) + ".sha256", "w") as sf:
            sf.write(f"{archive_sha}  {archive_name.name}\n")

        print(f"[BACKUP COMPLETE] Archive created: {archive_name} ({archive_name.stat().st_size} bytes)")
        print(f"SHA-256 Checksum: {archive_sha}")
        return archive_name

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    create_backup()

