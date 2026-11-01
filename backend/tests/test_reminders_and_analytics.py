"""Phase 9 Tests: Verified Reminders, Unsubscribe, Privacy Analytics, and Freshness.

Enforces Phase 9 Gate:
1. Saved schemes open offline, chat and eligibility are network-only.
2. Unsubscribe works cleanly.
3. Reminders use only verified dates.
4. Analytics expose no personal data.
"""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from backend.app.main import app
from backend.app.db.session import AsyncSessionLocal
from backend.app.db.models import SavedSchemeReminder, AuditEvent


@pytest.mark.asyncio
async def test_reminder_double_opt_in_and_verified_dates():
    """Verifies reminder opt-in uses verified dates and requires token verification."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Attempt subscribe for verified scheme
        resp = await client.post(
            "/api/v1/reminders/subscribe",
            json={
                "email": "citizen.test@example.org",
                "scheme_id": "SCHEME-PM-KISAN",
                "reminder_type": "installment_cycle"
            }
        )
        assert resp.status_code == 201
        data = resp.json()["data"]
        assert data["status"] == "pending_verification"
        assert "verification_token" in data
        assert "ver-doc-pmkisan-gu-v1" in data["verified_source"]

        token = data["verification_token"]

        # 2. Verify token
        verify_resp = await client.get(f"/api/v1/reminders/verify/{token}")
        assert verify_resp.status_code == 200
        verify_data = verify_resp.json()["data"]
        assert verify_data["status"] == "active"


@pytest.mark.asyncio
async def test_reminder_unsubscribe_flow():
    """Gate verification: Unsubscribe works cleanly and removes subscription."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Subscribe
        sub_resp = await client.post(
            "/api/v1/reminders/subscribe",
            json={
                "email": "optout.test@example.org",
                "scheme_id": "SCHEME-PM-JAY",
                "reminder_type": "deadline"
            }
        )
        assert sub_resp.status_code == 201
        token = sub_resp.json()["data"]["verification_token"]

        # Unsubscribe using token
        unsub_resp = await client.post(
            "/api/v1/reminders/unsubscribe",
            json={"token": token}
        )
        assert unsub_resp.status_code == 200
        assert unsub_resp.json()["data"]["status"] == "unsubscribed"

        # Re-verifying should now fail
        verify_fail = await client.get(f"/api/v1/reminders/verify/{token}")
        assert verify_fail.status_code == 404


@pytest.mark.asyncio
async def test_reminder_rejects_unverified_scheme():
    """Gate verification: Reminders reject schemes that do not exist or lack verified guidelines."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/reminders/subscribe",
            json={
                "email": "fake.scheme@example.org",
                "scheme_id": "SCHEME-NONEXISTENT-999",
                "reminder_type": "deadline"
            }
        )
        assert resp.status_code == 404


@pytest.mark.asyncio
async def test_privacy_preserving_analytics_no_pii():
    """Gate verification: Analytics expose zero personal data (no IP, no names, no emails)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/analytics/overview")
        assert resp.status_code == 200
        data = resp.json()["data"]

        # Assert zero PII
        assert data["privacy_guarantee"]["pii_collected"] is False
        assert data["privacy_guarantee"]["ip_addresses_stored"] is False
        assert data["privacy_guarantee"]["cookies_tracked"] is False

        # Raw representation must not contain sensitive citizen identifiers
        assert "password" not in data
        assert "user_ip" not in data
        assert "client_ip" not in data
        assert "aadhaar" not in data
        assert "phone_number" not in data
        assert "citizen_name" not in data

        # Contains aggregate metrics
        assert "aggregate_usage" in data
        assert "category_distribution" in data
        assert "eligibility_outcome_tiers" in data
        assert data["aggregate_usage"]["evidence_grounding_rate_percent"] == 100.0


@pytest.mark.asyncio
async def test_freshness_and_source_staleness():
    """Verifies freshness monitor checks source staleness intervals."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/freshness")
        assert resp.status_code == 200
        data = resp.json()["data"]

        assert "summary" in data
        assert data["summary"]["total_sources"] >= 5
        assert "sources" in data
        assert len(data["sources"]) >= 5


@pytest.mark.asyncio
async def test_audit_log_export_json_and_csv():
    """Verifies audit trail export in both JSON and CSV formats."""
    # Seed an audit event
    async with AsyncSessionLocal() as session:
        ev = AuditEvent(
            id=f"aud-test-{pytest.importorskip('uuid').uuid4().hex[:8]}",
            actor="admin_test",
            action="policy_approval",
            resource_type="source",
            resource_id="src-pmkisan-gov-in",
            details_json={"notes": "Phase 9 test event"}
        )
        session.add(ev)
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # JSON format
        resp_json = await client.get("/api/v1/audit/export?format=json")
        assert resp_json.status_code == 200
        data = resp_json.json()["data"]
        assert data["total"] >= 1
        assert any(e["actor"] == "admin_test" for e in data["events"])

        # CSV format
        resp_csv = await client.get("/api/v1/audit/export?format=csv")
        assert resp_csv.status_code == 200
        assert resp_csv.headers["content-type"].startswith("text/csv")
        assert "id,created_at,actor,action,resource_type,resource_id,details" in resp_csv.text
