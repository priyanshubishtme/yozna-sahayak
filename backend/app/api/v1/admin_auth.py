"""Admin Authentication, Gatekeeping and Master Passkey Security API.

Enforces zero-trust administrative boundaries:
- Verification of Master Passkey or Administrator credentials.
- Cryptographic HMAC-SHA256 session token generation and verification.
- Rejection of unauthenticated requests to administrative endpoints.
"""

import hmac
import hashlib
import time
import json
import base64
from typing import Optional
from fastapi import APIRouter, HTTPException, Header, Request, status
from pydantic import BaseModel, Field
from backend.app.config import settings
from backend.app.core.envelope import success_response, error_response
from backend.app.core.logging import logger

router = APIRouter(prefix="/admin/auth", tags=["Admin Authentication"])


class AdminLoginRequest(BaseModel):
    master_key: Optional[str] = Field(None, description="Direct Admin Master Passkey")
    username: Optional[str] = Field(None, description="Admin username")
    password: Optional[str] = Field(None, description="Admin password")


class AdminVerifyRequest(BaseModel):
    token: str = Field(..., description="Admin session token to verify")


def create_admin_token(username: str = "admin") -> str:
    """Creates a cryptographically signed time-bounded admin session token."""
    payload = {
        "user": username,
        "exp": int(time.time()) + (24 * 3600),  # 24 hour session
        "nonce": hashlib.sha256(f"{time.time()}:{username}".encode()).hexdigest()[:16]
    }
    raw_payload = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    sig = hmac.new(
        settings.admin_session_secret.encode('utf-8'),
        raw_payload,
        hashlib.sha256
    ).hexdigest()
    
    token = f"{base64.urlsafe_b64encode(raw_payload).decode('utf-8')}.{sig}"
    return token


def verify_admin_token(token: str) -> Optional[dict]:
    """Validates an admin session token signature and expiration."""
    if not token or "." not in token:
        return None
    try:
        b64_payload, sig = token.split(".", 1)
        raw_payload = base64.urlsafe_b64decode(b64_payload.encode('utf-8'))
        expected_sig = hmac.new(
            settings.admin_session_secret.encode('utf-8'),
            raw_payload,
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(sig, expected_sig):
            return None
            
        payload = json.loads(raw_payload.decode('utf-8'))
        if time.time() > payload.get("exp", 0):
            return None
            
        return payload
    except Exception as e:
        logger.warning(f"Admin token verification failed: {e}")
        return None


@router.post("/login")
async def admin_login(payload: AdminLoginRequest, request: Request):
    """Authenticates administrator via Master Key or Username/Password."""
    request_id = getattr(request.state, "request_id", "auth-req")
    
    # 1. Check Master Key Access
    is_master_key_valid = (
        payload.master_key and 
        hmac.compare_digest(payload.master_key.strip(), settings.admin_master_key.strip())
    )
    
    # 2. Check Username & Password Access
    is_credentials_valid = (
        payload.username and payload.password and
        hmac.compare_digest(payload.username.strip(), settings.admin_username.strip()) and
        hmac.compare_digest(payload.password.strip(), settings.admin_password.strip())
    )
    
    if not is_master_key_valid and not is_credentials_valid:
        logger.warning("Failed admin login attempt: invalid credentials/passkey.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrator credentials or master passkey."
        )
        
    username = payload.username if is_credentials_valid else "admin_master"
    token = create_admin_token(username)
    logger.info(f"Admin login successful for '{username}'. Session issued.")
    
    return success_response(
        data={
            "authenticated": True,
            "token": token,
            "username": username,
            "role": "superadmin",
            "access_tier": "Full Administrator",
            "expires_in_hours": 24
        },
        request_id=request_id
    )


@router.post("/verify")
async def admin_verify(payload: AdminVerifyRequest, request: Request):
    """Validates whether a currently held admin session token is valid and unexpired."""
    request_id = getattr(request.state, "request_id", "verify-req")
    data = verify_admin_token(payload.token)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin session token is invalid or expired."
        )
    return success_response(
        data={
            "valid": True,
            "username": data.get("user", "admin"),
            "role": "superadmin"
        },
        request_id=request_id
    )

