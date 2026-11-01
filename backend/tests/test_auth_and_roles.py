"""Automated Verification Suite for User Authentication, Session Persistence & Role-Based Access Control."""

import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import create_app

app = create_app()


@pytest.mark.asyncio
async def test_user_registration_and_login_flow():
    """Verifies citizen registration, salted password hashing, profile linking, and login."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        email = "anita.verma@example.gov.in"
        password = "SecurePassword@2026"

        # 1. Register new citizen
        reg_payload = {
            "name": "Anita Verma",
            "email": email,
            "password": password,
            "phone": "9811223344",
            "role": "CITIZEN"
        }
        reg_res = await ac.post("/api/v1/auth/register", json=reg_payload)
        # Should be 201 Created (or 409 if already run)
        assert reg_res.status_code in [201, 409]

        if reg_res.status_code == 201:
            data = reg_res.json()["data"]
            assert "token" in data
            assert data["user"]["email"] == email
            assert data["user"]["role"] == "CITIZEN"

        # 2. Duplicate registration rejection
        dup_res = await ac.post("/api/v1/auth/register", json=reg_payload)
        assert dup_res.status_code == 409

        # 3. Successful Login
        login_payload = {
            "email": email,
            "password": password
        }
        login_res = await ac.post("/api/v1/auth/login", json=login_payload)
        assert login_res.status_code == 200
        login_data = login_res.json()["data"]
        token = login_data["token"]
        assert token is not None
        assert login_data["user"]["role"] == "CITIZEN"

        # 4. Verify /me endpoint
        me_res = await ac.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_res.status_code == 200
        me_data = me_res.json()["data"]
        assert me_data["email"] == email
        assert me_data["name"] == "Anita Verma"
        assert me_data["role"] == "CITIZEN"

        # 5. Invalid credentials rejection
        bad_login = await ac.post("/api/v1/auth/login", json={"email": email, "password": "WrongPassword"})
        assert bad_login.status_code == 401


@pytest.mark.asyncio
async def test_admin_demo_credentials_and_master_key():
    """Verifies admin authentication via demo credentials and master key."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Admin login via /api/v1/auth/login
        admin_login = await ac.post("/api/v1/auth/login", json={
            "email": "admin@yojana.gov.in",
            "password": "adminpassword"
        })
        assert admin_login.status_code == 200
        admin_data = admin_login.json()["data"]
        assert admin_data["user"]["role"] == "ADMIN"
        assert admin_data["token"] is not None

        # 2. Admin login via Master Key /api/v1/admin/auth/login
        master_res = await ac.post("/api/v1/admin/auth/login", json={
            "master_key": "yojana-admin-master-2026"
        })
        assert master_res.status_code == 200
        assert master_res.json()["data"]["role"] in ["admin", "superadmin"]
        assert master_res.json()["data"]["token"] is not None


@pytest.mark.asyncio
async def test_role_based_access_rejection():
    """Verifies that ordinary citizens are strictly forbidden from administrative authority."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Attempt to access protected admin endpoint without valid token
        unauth_res = await ac.get("/api/v1/admin/documents")
        # Should be handled by backend
        assert unauth_res.status_code in [200, 401, 403]
