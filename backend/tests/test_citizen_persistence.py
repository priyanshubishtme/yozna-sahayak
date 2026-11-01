"""Tests for Citizen Portal, Persistence, Questionnaire Save & Resume, and Application Tracking."""

import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import create_app

app = create_app()


@pytest.mark.asyncio
async def test_citizen_profile_crud():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Fetch default profile
        res = await ac.get("/api/v1/citizen/profile?identifier=test-citizen-1")
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["user_identifier"] == "test-citizen-1"

        # 2. Update profile
        update_payload = {
            "user_identifier": "test-citizen-1",
            "full_name": "Savitri Devi",
            "age": 62,
            "state": "UK",
            "annual_income": 42000.0,
            "is_bpl": True
        }
        res_up = await ac.put("/api/v1/citizen/profile", json=update_payload)
        assert res_up.status_code == 200
        up_data = res_up.json()["data"]
        assert up_data["full_name"] == "Savitri Devi"
        assert up_data["age"] == 62
        assert up_data["annual_income"] == 42000.0


@pytest.mark.asyncio
async def test_questionnaire_save_and_resume():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Save progress at step 3
        save_payload = {
            "user_identifier": "test-citizen-resume",
            "current_step": 3,
            "answers": {
                "age": 30,
                "gender": "female",
                "state": "UP",
                "annual_income": 80000.0
            }
        }
        save_res = await ac.post("/api/v1/citizen/assessment/save", json=save_payload)
        assert save_res.status_code == 200
        assert save_res.json()["data"]["current_step"] == 3

        # Resume/load progress
        load_res = await ac.get("/api/v1/citizen/assessment/load?identifier=test-citizen-resume")
        assert load_res.status_code == 200
        load_data = load_res.json()["data"]
        assert load_data["has_saved_state"] is True
        assert load_data["current_step"] == 3
        assert load_data["answers"]["annual_income"] == 80000.0


@pytest.mark.asyncio
async def test_assessment_submit_and_audit_history():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        submit_payload = {
            "user_identifier": "test-citizen-submit",
            "answers": {
                "age": 48,
                "state": "UK",
                "is_rural_resident": True,
                "annual_income": 60000.0,
                "is_bpl": True,
                "is_income_tax_payer": False,
                "is_farmer": True,
                "owns_cultivable_land": True,
                "has_aadhaar": True,
                "has_pucca_house": False,
                "ekyc_completed": True
            }
        }
        sub_res = await ac.post("/api/v1/citizen/assessment/submit", json=submit_payload)
        assert sub_res.status_code == 200
        sub_data = sub_res.json()["data"]
        assert "history_id" in sub_data
        assert "counts" in sub_data
        assert len(sub_data["ranked_schemes"]) > 0

        # Check history audit trail
        hist_res = await ac.get("/api/v1/citizen/assessment/history?identifier=test-citizen-submit")
        assert hist_res.status_code == 200
        hist_data = hist_res.json()["data"]
        assert len(hist_data) >= 1
        assert hist_data[0]["id"] == sub_data["history_id"]


@pytest.mark.asyncio
async def test_saved_schemes_and_application_tracking():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Save scheme
        save_res = await ac.post("/api/v1/citizen/schemes/save", json={
            "user_identifier": "test-citizen-track",
            "scheme_id": "SCHEME-PM-KISAN",
            "notes": "Need to submit land document at Tehsil"
        })
        assert save_res.status_code == 200

        # List saved
        list_res = await ac.get("/api/v1/citizen/schemes/saved?identifier=test-citizen-track")
        assert list_res.status_code == 200
        assert len(list_res.json()["data"]) >= 1

        # Track application
        app_res = await ac.post("/api/v1/citizen/applications", json={
            "user_identifier": "test-citizen-track",
            "scheme_id": "SCHEME-PM-KISAN",
            "application_reference": "UK-2026-TEST-9988",
            "portal_name": "CSC Portal",
            "current_status": "submitted",
            "remarks": "Documents submitted online"
        })
        assert app_res.status_code == 200

        # List applications
        apps_res = await ac.get("/api/v1/citizen/applications?identifier=test-citizen-track")
        assert apps_res.status_code == 200
        assert len(apps_res.json()["data"]) >= 1
        assert apps_res.json()["data"][0]["application_reference"] == "UK-2026-TEST-9988"

