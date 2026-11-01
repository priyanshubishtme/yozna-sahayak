"""Fixture Source Adapter for reliable testing and offline demo execution."""

import time
from typing import Any, List
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


class FixtureSourceAdapter:
    """Adapter using offline fixtures for reliable tests and judging demonstrations."""
    adapter_key: str = "fixture_adapter_v1"
    adapter_version: str = "1.0.0"

    def __init__(self, fixture_items: List[dict] = None):
        self.fixtures = fixture_items or [
            {
                "url": "https://pmkisan.gov.in/documents/guidelines_2024.pdf",
                "title": "PM-KISAN Revised Operational Guidelines 2024",
                "issuer": "Ministry of Agriculture & Farmers Welfare",
                "content_type": "application/pdf",
                "content_bytes": b"%PDF-1.4 Mock PM-KISAN Operational Guidelines. Financial benefit of Rs 6000 per year.",
                "extracted_text": "Mock PM-KISAN Operational Guidelines. Financial benefit of Rs 6000 per year in 3 tranches.",
                "scheme_id": "SCHEME-PM-KISAN"
            },
            {
                "url": "https://socialwelfare.uk.gov.in/orders/old_age_pension_2024.pdf",
                "title": "Uttarakhand Old Age Pension Government Order 2024",
                "issuer": "Uttarakhand Social Welfare Department",
                "content_type": "application/pdf",
                "content_bytes": b"%PDF-1.4 Mock Uttarakhand Old Age Pension GO. Monthly pension Rs 1500.",
                "extracted_text": "Mock Uttarakhand Old Age Pension GO. Monthly pension Rs 1500 for senior citizens above 60.",
                "scheme_id": "SCHEME-UK-OLD-AGE"
            }
        ]

    async def discover(self, source: Any) -> List[DiscoveredResource]:
        """Returns discovered resources from the fixture catalogue."""
        resources = []
        for item in self.fixtures:
            canon = canonicalize_url(item["url"])
            resources.append(
                DiscoveredResource(
                    url=item["url"],
                    canonical_url=canon,
                    source_id=getattr(source, "source_id", "SRC-FIXTURE"),
                    content_type_hint=item["content_type"],
                    title_hint=item["title"]
                )
            )
        return resources

    async def fetch(self, resource: DiscoveredResource) -> FetchResult:
        """Fetches bytes from fixture store."""
        start = time.perf_counter()
        match = next((f for f in self.fixtures if f["url"] == resource.url), None)

        if not match:
            return FetchResult(
                url=resource.url,
                canonical_url=resource.canonical_url,
                source_id=resource.source_id,
                status_code=404,
                content_bytes=b"",
                content_type="text/plain",
                error="Fixture not found",
                latency_ms=(time.perf_counter() - start) * 1000
            )

        return FetchResult(
            url=resource.url,
            canonical_url=resource.canonical_url,
            source_id=resource.source_id,
            status_code=200,
            content_bytes=match["content_bytes"],
            content_type=match["content_type"],
            headers={"Content-Type": match["content_type"]},
            latency_ms=(time.perf_counter() - start) * 1000
        )

    def parse(self, fetched: FetchResult) -> List[ParsedCandidate]:
        """Parses fetched fixture candidate."""
        match = next((f for f in self.fixtures if f["url"] == fetched.url), {})
        return [
            ParsedCandidate(
                source_id=fetched.source_id,
                canonical_url=fetched.canonical_url,
                original_url=fetched.url,
                content_type=fetched.content_type,
                title=match.get("title", "Discovered Official Document"),
                issuer=match.get("issuer", "Government Department"),
                published_date="2026-10-01",
                extracted_text=match.get("extracted_text", ""),
                metadata={"scheme_id": match.get("scheme_id")}
            )
        ]

    def normalize(self, candidate: ParsedCandidate) -> NormalizedCandidate:
        """Computes hashes and creates normalized candidate."""
        match = next((f for f in self.fixtures if f["url"] == candidate.original_url), {})
        binary_sha = compute_sha256(match.get("content_bytes", b""))
        text_sha = compute_normalized_text_sha256(candidate.extracted_text)

        return NormalizedCandidate(
            source_id=candidate.source_id,
            canonical_url=candidate.canonical_url,
            original_url=candidate.original_url,
            content_type=candidate.content_type,
            binary_sha256=binary_sha,
            normalized_text_sha256=text_sha,
            title=candidate.title,
            issuer=candidate.issuer,
            detected_date=candidate.published_date,
            classification="new_resource",
            assigned_scheme_id=candidate.metadata.get("scheme_id"),
            extracted_text=candidate.extracted_text
        )
