"""Content-addressable storage for fetched documents and raw responses."""

import os
from pathlib import Path
from typing import Optional, Tuple
from backend.app.config import settings
from backend.app.core.logging import logger
from backend.app.sources.base import compute_binary_sha256, compute_text_sha256


class ContentStorageService:
    """Manages immutable persistence of raw downloaded binaries and extracted artifacts."""

    def __init__(self, base_dir: Optional[Path] = None):
        self.base_dir = base_dir or Path(settings.data_dir)
        self.fetched_dir = self.base_dir / "fetched"
        self.pdfs_dir = self.base_dir / "pdfs"
        self.debug_dir = self.base_dir / "debug"

        # Ensure directories exist
        self.fetched_dir.mkdir(parents=True, exist_ok=True)
        self.pdfs_dir.mkdir(parents=True, exist_ok=True)
        self.debug_dir.mkdir(parents=True, exist_ok=True)

    def store_bytes(
        self,
        content_bytes: bytes,
        content_type: str,
        filename_hint: Optional[str] = None
    ) -> Tuple[str, str]:
        """Stores raw bytes addressable by SHA-256 fingerprint.

        Returns (storage_path_relative, sha256_hex).
        """
        sha256_hex = compute_binary_sha256(content_bytes)

        if "pdf" in content_type.lower():
            target_path = self.pdfs_dir / f"{sha256_hex}.pdf"
            rel_path = f"data/pdfs/{sha256_hex}.pdf"
        else:
            ext = ".html" if "html" in content_type.lower() else ".bin"
            target_path = self.fetched_dir / f"{sha256_hex}{ext}"
            rel_path = f"data/fetched/{sha256_hex}{ext}"

        if not target_path.exists():
            target_path.write_bytes(content_bytes)
            logger.info(f"Stored immutable payload ({len(content_bytes)} bytes) at {target_path.name}")

        return rel_path, sha256_hex

    def get_bytes(self, sha256_hex: str) -> Optional[bytes]:
        """Retrieves raw content bytes by SHA-256 hash."""
        # Check pdfs dir
        pdf_path = self.pdfs_dir / f"{sha256_hex}.pdf"
        if pdf_path.exists():
            return pdf_path.read_bytes()

        # Check fetched dir
        for ext in [".html", ".bin", ".txt"]:
            f_path = self.fetched_dir / f"{sha256_hex}{ext}"
            if f_path.exists():
                return f_path.read_bytes()

        return None

    def store_text_snippet(self, sha256_hex: str, text: str) -> str:
        """Stores normalized text preview for fast diffing without re-parsing."""
        snippet_path = self.fetched_dir / f"{sha256_hex}_normalized.txt"
        snippet_path.write_text(text, encoding="utf-8", errors="replace")
        return f"data/fetched/{sha256_hex}_normalized.txt"

    def get_text_snippet(self, sha256_hex: str) -> Optional[str]:
        """Reads stored normalized text preview if present."""
        snippet_path = self.fetched_dir / f"{sha256_hex}_normalized.txt"
        if snippet_path.exists():
            return snippet_path.read_text(encoding="utf-8", errors="replace")
        return None


# Global singleton instance
storage_service = ContentStorageService()
