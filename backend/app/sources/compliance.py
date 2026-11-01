"""Compliance Gate and Policy Verification Service.

Enforces Blueprint V2 Section 3.3, 3.5, and Phase 2 Gate Rules:
- A prohibited or pending source cannot run automatically.
- myScheme automation remains disabled absent verified written authorization.
- robots.txt and Terms of Use review gating.
"""

from datetime import datetime, timezone
from typing import Optional, Tuple
import urllib.robotparser
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.logging import logger
from backend.app.db.base import utc_now
from backend.app.db.models import AuditEvent, Source
from backend.app.sources.base import PolicyViolationError


class ComplianceGate:
    """Evaluates and enforces source compliance policies."""

    @staticmethod
    def can_run_automatically(source: Source) -> Tuple[bool, Optional[str]]:
        """Determines whether a source is legally and operationally permitted to run automated discovery.

        Returns (is_allowed, reason_if_blocked).
        """
        # 1. Permission status must be explicitly approved by human reviewer
        if source.permission_status != "approved":
            return False, f"Source permission status is '{source.permission_status}' (must be 'approved')."

        # 2. Automation must be explicitly enabled
        if source.automation_status != "enabled":
            return False, f"Source automation is currently '{source.automation_status}'."

        # 3. Overall enabled flag must be true
        if not source.enabled:
            return False, "Source is flagged as disabled in registry."

        # 4. Strict myScheme constraint per Blueprint Section 3.3
        if source.source_id == "SRC-MYSCHEME-DIR" or "myscheme" in source.base_url.lower():
            if not source.written_authorization_reference:
                return False, (
                    "myScheme Terms of Use prohibit automated scraping without express written authorization "
                    "(Blueprint Section 3.3). No written authorization recorded."
                )

        # 5. Must have documented robots.txt review
        if not source.robots_checked_at:
            return False, "Source has no recorded robots.txt inspection timestamp."

        # 6. Must have documented Terms of Use review
        if not source.terms_checked_at:
            return False, "Source has no recorded Terms of Use inspection timestamp."

        return True, None

    @staticmethod
    def assert_can_run(source: Source) -> None:
        """Raises PolicyViolationError if source cannot run automated discovery."""
        allowed, reason = ComplianceGate.can_run_automatically(source)
        if not allowed:
            raise PolicyViolationError(f"Compliance Gate Block: {reason}")


async def check_source_robots_txt(
    source: Source,
    user_agent: str = "YojanaSahayakResearchBot"
) -> Tuple[bool, str]:
    """Inspects robots.txt for a source URL and returns (allowed, details)."""
    base = source.base_url.rstrip("/")
    robots_url = f"{base}/robots.txt"

    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(robots_url, headers={"User-Agent": user_agent})

        if resp.status_code == 404:
            # No robots.txt indicates standard crawlability under web conventions
            return True, "No robots.txt found (404); default permissive."
        elif resp.status_code >= 400:
            return False, f"robots.txt probe returned HTTP {resp.status_code}."

        rp = urllib.robotparser.RobotFileParser()
        rp.parse(resp.text.splitlines())

        can_fetch = rp.can_fetch(user_agent, source.base_url)
        details = f"robots.txt evaluated: can_fetch={can_fetch} for user-agent '{user_agent}'."
        return can_fetch, details

    except Exception as e:
        logger.warning(f"robots.txt check failed for {source.source_id}: {e}")
        return False, f"robots.txt check error: {str(e)}"
