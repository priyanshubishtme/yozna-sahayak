"""Pytest configuration and test fixtures."""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from backend.app.main import app


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test", headers={"X-Test-Bypass": "true"}) as ac:
        yield ac
