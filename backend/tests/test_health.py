"""Tests for health endpoint and scheme discovery."""

import pytest


@pytest.mark.asyncio
async def test_health_endpoint(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert "data" in data
    assert data["data"]["status"] == "ok"
    assert data["data"]["database_connected"] is True
    assert "meta" in data
    assert "request_id" in data["meta"]


@pytest.mark.asyncio
async def test_schemes_catalogue(client):
    response = await client.get("/api/v1/schemes")
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert isinstance(data["data"], list)
    assert len(data["data"]) >= 13

    # Check first scheme structure
    pm_kisan = next((s for s in data["data"] if s["code"] == "pm_kisan"), None)
    assert pm_kisan is not None
    assert "PM-KISAN" in pm_kisan["name_en"]
    assert pm_kisan["rag_enabled"] is True
    assert pm_kisan["rules_enabled"] is True


@pytest.mark.asyncio
async def test_scheme_detail(client):
    response = await client.get("/api/v1/schemes/SCHEME-PM-KISAN")
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert data["data"]["scheme_id"] == "SCHEME-PM-KISAN"


@pytest.mark.asyncio
async def test_scheme_not_found(client):
    response = await client.get("/api/v1/schemes/SCHEME-NON-EXISTENT")
    assert response.status_code == 404
    data = response.json()
    assert data["ok"] is False
    assert data["error"]["code"] == "SCHEME_NOT_FOUND"
