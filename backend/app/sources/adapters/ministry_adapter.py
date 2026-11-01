"""Central Ministry & State Department Source Adapter."""

import time
from typing import Any, List
from bs4 import BeautifulSoup
import httpx
from backend.app.core.logging import logger
from backend.app.sources.base import (
    DiscoveredResource,
    FetchResult,
    NormalizedCandidate,
    ParsedCandidate,
    SourceAdapter,
    canonicalize_url,
    compute_normalized_text_sha256,
    compute_sha256
)


class MinistryListingAdapter:
    """Standard HTTP discovery adapter for permitted government scheme portals."""
    adapter_key: str = "ministry_listing_v1"
    adapter_version: str = "1.0.0"

    def __init__(self, user_agent: str = "YojanaSahayakResearchBot/1.0"):
        self.user_agent = user_agent

    async def discover(self, source: Any) -> List[DiscoveredResource]:
        """Fetches listing page and finds linked circulars/PDFs."""
        base_url = source.base_url
        headers = {"User-Agent": self.user_agent}

        discovered: List[DiscoveredResource] = []
        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                res = await client.get(base_url, headers=headers)

            if res.status_code == 200:
                soup = BeautifulSoup(res.text, "html.parser")
                for link in soup.find_all("a", href=True):
                    href = link["href"].strip()
                    if href.lower().endswith(".pdf") or "guidelines" in href.lower() or "scheme" in href.lower():
                        # Resolve relative links
                        full_url = href if href.startswith("http") else f"{base_url.rstrip('/')}/{href.lstrip('/')}"
                        canon = canonicalize_url(full_url)
                        discovered.append(
                            DiscoveredResource(
                                url=full_url,
                                canonical_url=canon,
                                source_id=source.source_id,
                                content_type_hint="application/pdf" if href.lower().endswith(".pdf") else "text/html",
                                title_hint=link.get_text(strip=True) or "Official Document Link",
                                parent_url=base_url
                            )
                        )
        except Exception as e:
            logger.warning(f"Discovery network warning for {source.source_id}: {e}")

        return discovered

    async def fetch(self, resource: DiscoveredResource) -> FetchResult:
        """Fetches resource bytes with timeouts and headers."""
        start = time.perf_counter()
        headers = {"User-Agent": self.user_agent}

        try:
            async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
                res = await client.get(resource.url, headers=headers)

            latency = (time.perf_counter() - start) * 1000
            return FetchResult(
                url=resource.url,
                canonical_url=resource.canonical_url,
                source_id=resource.source_id,
                status_code=res.status_code,
                content_bytes=res.content,
                content_type=res.headers.get("Content-Type", "application/octet-stream"),
                headers=dict(res.headers),
                etag=res.headers.get("ETag"),
                last_modified=res.headers.get("Last-Modified"),
                latency_ms=latency
            )
        except Exception as e:
            latency = (time.perf_counter() - start) * 1000
            return FetchResult(
                url=resource.url,
                canonical_url=resource.canonical_url,
                source_id=resource.source_id,
                status_code=None,
                content_bytes=b"",
                content_type="text/plain",
                error=str(e),
                latency_ms=latency
            )

    def parse(self, fetched: FetchResult) -> List[ParsedCandidate]:
        """Parses fetched result into candidate metadata."""
        if fetched.status_code != 200:
            return []

        title = "Discovered Document"
        text = ""

        if "text/html" in fetched.content_type.lower():
            soup = BeautifulSoup(fetched.content_bytes, "html.parser")
            if soup.title:
                title = soup.title.get_text(strip=True)
            text = soup.get_text(separator=" ", strip=True)
        else:
            title = fetched.url.split("/")[-1]

        return [
            ParsedCandidate(
                source_id=fetched.source_id,
                canonical_url=fetched.canonical_url,
                original_url=fetched.url,
                content_type=fetched.content_type,
                title=title,
                extracted_text=text[:2000]
            )
        ]

    def normalize(self, candidate: ParsedCandidate) -> NormalizedCandidate:
        """Computes hashes and creates normalized candidate."""
        return NormalizedCandidate(
            source_id=candidate.source_id,
            canonical_url=candidate.canonical_url,
            original_url=candidate.original_url,
            content_type=candidate.content_type,
            binary_sha256=compute_sha256(candidate.extracted_text.encode("utf-8")),
            normalized_text_sha256=compute_normalized_text_sha256(candidate.extracted_text),
            title=candidate.title,
            issuer=candidate.issuer,
            detected_date=candidate.published_date,
            classification="new_resource",
            extracted_text=candidate.extracted_text
        )
