"""Source Adapter Protocol and Data Transfer Objects per Blueprint V2 Section 4.2."""

from dataclasses import dataclass, field
from datetime import datetime, timezone
import hashlib
from typing import Any, Dict, List, Optional, Protocol, runtime_checkable
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode


def canonicalize_url(url: str) -> str:
    """Normalizes URL by removing tracking query params, lowercasing scheme/host, and sorting query keys."""
    if not url:
        return ""
    parsed = urlparse(url.strip())
    # Strip tracking parameters like utm_*, fbclid, etc.
    filtered_queries = [
        (k, v) for k, v in parse_qsl(parsed.query, keep_blank_values=True)
        if not k.startswith("utm_") and k not in {"fbclid", "gclid", "ref", "source"}
    ]
    filtered_queries.sort(key=lambda x: x[0])
    cleaned_query = urlencode(filtered_queries)

    # Reconstruct normalized URL
    normalized_path = parsed.path or "/"
    if normalized_path.endswith("//"):
        normalized_path = normalized_path.rstrip("/") + "/"

    return urlunparse((
        parsed.scheme.lower(),
        parsed.netloc.lower(),
        normalized_path,
        parsed.params,
        cleaned_query,
        ""  # strip fragments
    ))


def compute_sha256(data: bytes) -> str:
    """Computes SHA-256 hexadecimal hash of bytes."""
    return hashlib.sha256(data).hexdigest()


compute_binary_sha256 = compute_sha256


def compute_normalized_text_sha256(text: str) -> str:
    """Computes SHA-256 hash of whitespace-normalized text."""
    normalized = " ".join((text or "").split()).strip().lower()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


compute_text_sha256 = compute_normalized_text_sha256


@dataclass
class DiscoveredResource:
    """A resource pointer discovered on a source website or feed."""
    url: str
    canonical_url: str
    source_id: str
    content_type_hint: Optional[str] = None
    title_hint: Optional[str] = None
    parent_url: Optional[str] = None
    discovered_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class FetchResult:
    """Result of an HTTP/manual fetch attempt."""
    url: str
    canonical_url: str
    source_id: str
    status_code: Optional[int]
    content_bytes: bytes
    content_type: str
    headers: Dict[str, str] = field(default_factory=dict)
    etag: Optional[str] = None
    last_modified: Optional[str] = None
    latency_ms: float = 0.0
    error: Optional[str] = None
    fetched_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def binary_sha256(self) -> str:
        return compute_sha256(self.content_bytes)


@dataclass
class ParsedCandidate:
    """Candidate resource extracted from fetched bytes."""
    source_id: str
    canonical_url: str
    original_url: str
    content_type: str
    title: Optional[str] = None
    issuer: Optional[str] = None
    published_date: Optional[str] = None
    extracted_text: str = ""
    extracted_links: List[str] = field(default_factory=list)
    pdf_links: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class NormalizedCandidate:
    """Normalized candidate ready for candidate classification and review queue."""
    source_id: str
    canonical_url: str
    original_url: str
    content_type: str
    binary_sha256: str
    normalized_text_sha256: Optional[str]
    title: Optional[str]
    issuer: Optional[str]
    detected_date: Optional[str]
    classification: str  # new_resource | changed_binary | changed_content | duplicate
    assigned_scheme_id: Optional[str] = None
    extracted_text: str = ""


class PolicyViolationError(Exception):
    """Raised when an adapter attempts to fetch or crawl a prohibited source."""
    pass


@runtime_checkable
class SourceAdapter(Protocol):
    """Common interface for all source-specific adapters per Blueprint Section 4.2."""
    adapter_key: str
    adapter_version: str

    async def discover(self, source: Any) -> List[DiscoveredResource]:
        """Discovers resources on the source portal within allowed boundaries."""
        ...

    async def fetch(self, resource: DiscoveredResource) -> FetchResult:
        """Fetches bytes with rate-limiting, timeout, and size limits."""
        ...

    def parse(self, fetched: FetchResult) -> List[ParsedCandidate]:
        """Parses HTML/PDF/feed metadata and outgoing official links."""
        ...

    def normalize(self, candidate: ParsedCandidate) -> NormalizedCandidate:
        """Normalizes candidate metadata and calculates fingerprints."""
        ...
