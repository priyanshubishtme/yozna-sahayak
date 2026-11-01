"""Source adapters, compliance gates, and discovery engine package."""
from backend.app.sources.base import (
    DiscoveredResource,
    FetchResult,
    ParsedCandidate,
    NormalizedCandidate,
    SourceAdapter
)

__all__ = [
    "DiscoveredResource",
    "FetchResult",
    "ParsedCandidate",
    "NormalizedCandidate",
    "SourceAdapter"
]
