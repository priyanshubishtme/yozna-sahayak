"""Seeds initial 13 schemes and official sources from YAML registries into the database."""

from pathlib import Path
import yaml
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.logging import logger
from backend.app.db.base import Base
from backend.app.db.session import sync_engine
from backend.app.db.models import Scheme, Source

REGISTRY_DIR = Path(__file__).resolve().parent.parent.parent.parent / "registry"


async def seed_database(session: AsyncSession) -> None:
    """Populates database with initial schemes and sources if tables are empty."""
    # Ensure all tables defined in models are created in the database
    Base.metadata.create_all(bind=sync_engine)

    # 1. Seed Schemes
    schemes_file = REGISTRY_DIR / "schemes.yaml"
    if schemes_file.exists():
        with open(schemes_file, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
            scheme_list = data.get("schemes", [])

        for item in scheme_list:
            existing = await session.execute(
                select(Scheme).where(Scheme.scheme_id == item["scheme_id"])
            )
            if not existing.scalar_one_or_none():
                scheme = Scheme(
                    scheme_id=item["scheme_id"],
                    code=item["code"],
                    name_en=item["name_en"],
                    name_hi=item["name_hi"],
                    short_name=item.get("short_name"),
                    level=item.get("level", "central"),
                    ministry_or_dept=item.get("ministry_or_dept"),
                    category=item.get("category", "General"),
                    description_en=item["description_en"],
                    description_hi=item["description_hi"],
                    initial_mode=item.get("initial_mode", "rag_only"),
                    rule_scope=item.get("rule_scope", "rag_only"),
                    rag_enabled=item.get("rag_enabled", False),
                    rules_enabled=item.get("rules_enabled", False),
                    official_portal_url=item.get("official_portal_url"),
                    benefits_summary_en=item.get("benefits_summary_en"),
                    benefits_summary_hi=item.get("benefits_summary_hi")
                )
                session.add(scheme)
        await session.commit()
        logger.info(f"Seeded {len(scheme_list)} initial scheme records.")

    # 2. Seed Sources
    sources_file = REGISTRY_DIR / "sources.yaml"
    if sources_file.exists():
        with open(sources_file, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
            source_list = data.get("sources", [])

        for s in source_list:
            existing = await session.execute(
                select(Source).where(Source.source_id == s["source_id"])
            )
            if not existing.scalar_one_or_none():
                source = Source(
                    source_id=s["source_id"],
                    name=s["name"],
                    base_url=s["base_url"],
                    source_family=s["source_family"],
                    jurisdiction=s.get("jurisdiction", "IN"),
                    language_hints=s.get("language_hints", ["en"]),
                    source_role=s.get("source_role", "discovery_and_authoritative_documents"),
                    adapter_key=s["adapter_key"],
                    fetch_mode=s.get("fetch_mode", "requests"),
                    allowed_content_types=s.get("allowed_content_types", ["text/html"]),
                    permission_status=s.get("permission_status", "pending_review"),
                    automation_status=s.get("automation_status", "disabled"),
                    written_authorization_reference=s.get("written_authorization_reference"),
                    notes=s.get("notes"),
                    request_interval_seconds=s.get("request_interval_seconds", 5),
                    max_pages_per_run=s.get("max_pages_per_run", 20),
                    max_download_mb=s.get("max_download_mb", 40),
                    schedule_cron=s.get("schedule_cron", "0 3 * * *"),
                    enabled=s.get("enabled", False)
                )
                session.add(source)
        await session.commit()
        logger.info(f"Seeded {len(source_list)} official source records.")
