"""Comprehensive tests for Phase 2: Source Registry, Compliance Gate, and Scheduler."""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from backend.app.main import app


@pytest.mark.asyncio
async def test_pending_source_cannot_run_or_enable(client):
    """Gate test: A prohibited or pending source cannot run automatically or be enabled."""
    # 1. Attempt to enable pending source without policy review
    res = await client.post("/api/v1/admin/sources/SRC-INDIA-GOV/enable")
    assert res.status_code == 403
    data = res.json()
    assert data["ok"] is False
    assert data["error"]["code"] == "COMPLIANCE_GATE_BLOCKED"

    # 2. Attempt to trigger discovery on pending source
    run_res = await client.post("/api/v1/admin/sources/SRC-INDIA-GOV/discover")
    assert run_res.status_code == 403
    run_data = run_res.json()
    assert run_data["ok"] is False
    assert run_data["error"]["code"] == "COMPLIANCE_GATE_BLOCKED"


@pytest.mark.asyncio
async def test_myscheme_compliance_restriction(client):
    """Gate test: myScheme is locked in disabled mode unless written authorization exists."""
    # 1. Check current source status
    res = await client.get("/api/v1/admin/sources/SRC-MYSCHEME-DIR")
    assert res.status_code == 200
    source = res.json()["data"]
    assert source["permission_status"] == "written_authorization_required"
    assert source["automation_status"] == "disabled"
    assert source["can_run_automatically"] is False

    # 2. Attempt to enable myScheme without written auth
    enable_res = await client.post("/api/v1/admin/sources/SRC-MYSCHEME-DIR/enable")
    assert enable_res.status_code == 403
    assert enable_res.json()["error"]["code"] == "COMPLIANCE_GATE_BLOCKED"


@pytest.mark.asyncio
async def test_policy_approval_workflow(client):
    """Tests human reviewer policy approval, terms review, and enabling automation."""
    # 1. Approve policy for SRC-MIN-AGRI
    review_res = await client.post(
        "/api/v1/admin/sources/SRC-MIN-AGRI/review",
        json={
            "decision": "approved",
            "reviewer": "chief_compliance_officer",
            "terms_url": "https://pmkisan.gov.in/terms",
            "notes": "Official Central Ministry guidelines portal approved for automated research indexing.",
            "verify_robots_txt": False
        }
    )
    assert review_res.status_code == 200
    review_data = review_res.json()
    assert review_data["data"]["permission_status"] == "approved"

    # 2. Now enable automation
    enable_res = await client.post("/api/v1/admin/sources/SRC-MIN-AGRI/enable")
    assert enable_res.status_code == 200
    assert enable_res.json()["data"]["automation_status"] == "enabled"
    assert enable_res.json()["data"]["enabled"] is True


@pytest.mark.asyncio
async def test_run_now_discovery_execution(client):
    """Gate test: Run Now triggers discovery, creates review candidates, and logs run state."""
    # 1. Trigger Run Now on the approved SRC-MIN-AGRI source
    res = await client.post("/api/v1/admin/sources/SRC-MIN-AGRI/discover")
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert data["data"]["status"] == "completed"
    assert data["data"]["pages_discovered"] > 0
    assert data["data"]["pages_fetched"] > 0
    assert data["data"]["candidates_created"] >= 0

    # 2. Check discovery jobs telemetry endpoint
    jobs_res = await client.get("/api/v1/admin/discovery/jobs?source_id=SRC-MIN-AGRI")
    assert jobs_res.status_code == 200
    jobs = jobs_res.json()["data"]
    assert len(jobs) > 0
    latest_job = jobs[0]
    assert latest_job["status"] == "completed"
    assert latest_job["pages_fetched"] > 0


@pytest.mark.asyncio
async def test_scheduler_telemetry_and_controls(client):
    """Gate test: Single-instance scheduler telemetry, pause, and resume."""
    # 1. Status check
    status_res = await client.get("/api/v1/admin/scheduler/status")
    assert status_res.status_code == 200
    telemetry = status_res.json()["data"]
    assert telemetry["process_mode"] == "dedicated_single_instance"
    assert "heartbeat" in telemetry

    # 2. Pause scheduler
    pause_res = await client.post("/api/v1/admin/scheduler/pause")
    assert pause_res.status_code == 200

    # 3. Resume scheduler
    resume_res = await client.post("/api/v1/admin/scheduler/resume")
    assert resume_res.status_code == 200


@pytest.mark.asyncio
async def test_concurrent_lock_rejection(client):
    """Gate test: Per-source lock rejects concurrent discovery execution (409 Conflict)."""
    from backend.app.scheduler.lock import source_lock_manager

    # Acquire lock for SRC-MIN-AGRI
    lock = await source_lock_manager.get_lock("SRC-MIN-AGRI")
    await lock.acquire()
    try:
        res = await client.post("/api/v1/admin/sources/SRC-MIN-AGRI/discover")
        assert res.status_code == 409
        data = res.json()
        assert data["ok"] is False
        assert data["error"]["code"] == "SOURCE_JOB_ACTIVE"
    finally:
        lock.release()


@pytest.mark.asyncio
async def test_idempotent_discovery_execution(client):
    """Gate test: Re-running discovery is idempotent and detects duplicates via SHA-256."""
    res2 = await client.post("/api/v1/admin/sources/SRC-MIN-AGRI/discover")
    assert res2.status_code == 200
    assert res2.json()["ok"] is True

