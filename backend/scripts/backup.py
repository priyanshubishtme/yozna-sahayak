"""Automated Persistence Backup Utility.

Enforces Blueprint Section 16.3 & Phase 10:
- Archives SQLite database, document storage, and vector index.
- Computes SHA-256 integrity checksum for the archive.
- Creates timestamped archives in data/backups/.
"""

import hashlib
import os
import tarfile
from datetime import datetime, timezone
from pathlib import Path


def create_backup(data_dir: str = "./data", backup_dest: str = "./data/backups") -> str:
    data_path = Path(data_dir)
    dest_path = Path(backup_dest)
    dest_path.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    archive_name = f"yojana_sahayak_backup_{timestamp}.tar.gz"
    archive_path = dest_path / archive_name

    print(f"Creating backup archive: {archive_path}")

    # Files to archive
    with tarfile.open(archive_path, "w:gz") as tar:
        # 1. SQLite Database
        db_file = data_path / "yojana_sahayak.db"
        if db_file.exists():
            tar.add(db_file, arcname="yojana_sahayak.db")
            print(f"  + Added database: {db_file}")

        # 2. Documents directory
        doc_dir = data_path / "documents"
        if doc_dir.exists():
            tar.add(doc_dir, arcname="documents")
            print(f"  + Added documents storage: {doc_dir}")

        # 3. Debug rendered images
        debug_dir = data_path / "debug"
        if debug_dir.exists():
            tar.add(debug_dir, arcname="debug")
            print(f"  + Added diagnostics debug files: {debug_dir}")

    # Compute SHA-256 checksum
    hasher = hashlib.sha256()
    with open(archive_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    checksum = hasher.hexdigest()

    checksum_file = dest_path / f"{archive_name}.sha256"
    checksum_file.write_text(f"{checksum}  {archive_name}\n", encoding="utf-8")

    print(f"Backup complete!")
    print(f"Archive: {archive_path} ({archive_path.stat().st_size} bytes)")
    print(f"SHA-256: {checksum}")
    return str(archive_path)


if __name__ == "__main__":
    create_backup()

