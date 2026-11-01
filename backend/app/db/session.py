"""Database engine initialization and async session context managers."""

import os
from pathlib import Path
from typing import AsyncGenerator
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import sessionmaker, Session
from backend.app.config import settings

# Ensure data directory exists
os.makedirs(settings.data_dir, exist_ok=True)
os.makedirs(settings.data_dir / "pdfs", exist_ok=True)
os.makedirs(settings.data_dir / "fetched", exist_ok=True)
os.makedirs(settings.data_dir / "debug", exist_ok=True)
os.makedirs(settings.chroma_persist_dir, exist_ok=True)

# Async engine for FastAPI endpoints
async_engine = create_async_engine(
    settings.database_url,
    echo=False,
    future=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Synchronous engine for Alembic and migration scripts
sync_engine = create_engine(
    settings.database_sync_url,
    echo=False,
    future=True
)

SyncSessionLocal = sessionmaker(
    bind=sync_engine,
    autocommit=False,
    autoflush=False
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


def get_sync_db() -> Session:
    """Helper for synchronous background workers/migrations."""
    return SyncSessionLocal()
