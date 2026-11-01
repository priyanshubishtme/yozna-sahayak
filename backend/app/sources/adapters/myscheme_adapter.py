"""myScheme Source Adapter implementing strict Blueprint Section 3.3 compliance."""

from typing import Any, List
from backend.app.sources.base import (
    DiscoveredResource,
    FetchResult,
    NormalizedCandidate,
    ParsedCandidate,
    PolicyViolationError,
    SourceAdapter
)


class MySchemeManualAdapter:
    """myScheme adapter with strict compliance gates.

    Per Blueprint Section 3.3:
    "myScheme Terms of Use state that bots and automated tools may not access platform pages
    unless expressly authorized in writing. Therefore set automation_status: disabled_pending_written_authorization
    by default. Manual discovery curation only."
    """
    adapter_key: str = "myscheme_portal_v1"
    adapter_version: str = "1.0.0"

    async def discover(self, source: Any) -> List[DiscoveredResource]:
        """Strictly blocks automated discovery unless valid written authorization is verified."""
        auth_ref = getattr(source, "written_authorization_reference", None)
        auto_status = getattr(source, "automation_status", "disabled")

        if auto_status != "enabled" or not auth_ref:
            raise PolicyViolationError(
                "myScheme Terms of Use prohibit automated bots/scrapers without express written authorization "
                "(Blueprint Section 3.3). Automated discovery blocked. Manual pointer entry only."
            )

        # If authorized in writing by government authority:
        return []

    async def fetch(self, resource: DiscoveredResource) -> FetchResult:
        raise PolicyViolationError("Automated network fetch against myScheme is disabled by policy.")

    def parse(self, fetched: FetchResult) -> List[ParsedCandidate]:
        return []

    def normalize(self, candidate: ParsedCandidate) -> NormalizedCandidate:
        raise NotImplementedError("myScheme does not produce automated candidates.")
