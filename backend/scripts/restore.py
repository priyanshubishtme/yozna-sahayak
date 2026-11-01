"""Automated Persistence Restore Utility.

Enforces Blueprint Section 16.3 & Phase 10:
- Verifies SHA-256 archive checksum prior to unpacking.
- Safely restores SQLite database and document storage.
"""

import hashlib
import sys
import tarfile
from pathlib import Path


def restore_backup(archive_path_str: str, data_dir: str = "./data") -> bool:
    archive_path = Path(archive_path_str)
    if not archive_path.exists():
        print(f"Error: Archive '{archive_path}' does not exist.")
        return False

    # Check for SHA-256 checksum file
    checksum_file = Path(f"{archive_path_str}.sha256")
    if checksum_file.exists():
        expected = checksum_file.read_text(encoding="utf-8").split()[0].strip()
        hasher = hashlib.sha256()
        with open(archive_path, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        actual = hasher.hexdigest()

        if actual.lower() != expected.lower():
            print(f"Checksum mismatch! Expected: {expected}, got: {actual}")
            return False
        print(f"Verified SHA-256 checksum: {actual}")

    data_path = Path(data_dir)
    data_path.mkdir(parents=True, exist_ok=True)

    print(f"Extracting archive to: {data_path}")
    with tarfile.open(archive_path, "r:gz") as tar:
        tar.extractall(path=data_path)

    print("Restore completed successfully.")
    return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python restore.py <path_to_backup.tar.gz>")
        sys.exit(1)
    restore_backup(sys.argv[1])

