"""Source Adapter Registry resolving adapter implementations by adapter_key."""

from typing import Dict
from backend.app.sources.adapters.fixture_adapter import FixtureSourceAdapter
from backend.app.sources.adapters.ministry_adapter import MinistryListingAdapter
from backend.app.sources.adapters.myscheme_adapter import MySchemeManualAdapter
from backend.app.sources.base import SourceAdapter

# Central registry of available adapters
ADAPTER_REGISTRY: Dict[str, SourceAdapter] = {
    "fixture_adapter_v1": FixtureSourceAdapter(),
    "myscheme_portal_v1": MySchemeManualAdapter(),
    "ministry_listing_v1": MinistryListingAdapter(),
    "pmkisan_guidelines_v1": FixtureSourceAdapter(),
    "uk_social_welfare_v1": FixtureSourceAdapter(),
    "india_gov_listing_v1": MinistryListingAdapter(),
    "education_scholarships_v1": MinistryListingAdapter()
}


def get_adapter(adapter_key: str) -> SourceAdapter:
    """Retrieves source adapter instance for a given adapter key.

    Defaults to FixtureSourceAdapter if unknown for safe deterministic execution.
    """
    return ADAPTER_REGISTRY.get(adapter_key, ADAPTER_REGISTRY["fixture_adapter_v1"])
