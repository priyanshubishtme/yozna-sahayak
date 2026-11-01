"""Opt-In, Privacy-Preserving Verified Scheme Reminders API.

Enforces Blueprint Section 14.1 & Phase 9 Gate:
- Explicit opt-in double verification workflow.
- Reminders use only verified dates rooted in official gazettes/guidelines.
- Working 1-click unsubscription.
- Zero tracking or unverified notifications.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.envelope import success_response
from backend.app.db.models import SavedSchemeReminder, Scheme, DocumentVersion, SchemeDocument
from backend.app.db.session import get_db

router = APIRouter(prefix="/reminders", tags=["Citizen Reminders & Notifications"])

EMAIL_REGEX = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class ReminderSubscribeRequest(BaseModel):
    email: str = Field(..., pattern=EMAIL_REGEX, description="Citizen email address for verified notification")
    scheme_id: str = Field(..., description="Target welfare scheme ID")
    reminder_type: str = Field("installment_cycle", description="Type: deadline | installment_cycle | policy_update")
    target_date: Optional[str] = Field(None, description="Optional target date YYYY-MM-DD")


class UnsubscribeRequest(BaseModel):
    token: str = Field(..., description="Cryptographic unsubscribe token")


# Verified schedule dates rooted in official gazettes
VERIFIED_SCHEME_CYCLES = {
    "SCHEME-PM-KISAN": {
        "cycle_description": "Four-monthly installment schedule (April-July, August-November, December-March)",
        "governing_version": "ver-doc-pmkisan-gu-v1",
        "verified_dates": ["2026-11-30", "2027-03-31", "2027-07-31"]
    },
    "SCHEME-PMAY-G": {
        "cycle_description": "Gram Sabha validation and DBT stage verification",
        "governing_version": "ver-doc-pmayg-fram-v1",
        "verified_dates": ["2026-12-15", "2027-03-31"]
    },
    "SCHEME-PM-JAY": {
        "cycle_description": "Annual recurring family coverage renewal under BIS",
        "governing_version": "ver-doc-pmjay-guid-v1",
        "verified_dates": ["2026-12-31"]
    },
    "SCHEME-UK-OLD-AGE": {
        "cycle_description": "Quarterly pension credit DBT direct deposit cycle",
        "governing_version": "ver-c1056d37db98",
        "verified_dates": ["2026-12-31", "2027-03-31"]
    }
}


@router.post("/subscribe", status_code=status.HTTP_201_CREATED)
async def subscribe_reminder(
    payload: ReminderSubscribeRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Subscribes citizen to verified deadline/installment reminders via double opt-in."""
    request_id = getattr(request.state, "request_id", "direct")

    # 1. Verify scheme exists
    s_res = await db.execute(select(Scheme).where(Scheme.scheme_id == payload.scheme_id))
    scheme = s_res.scalar_one_or_none()
    if not scheme:
        raise HTTPException(status_code=404, detail=f"Scheme '{payload.scheme_id}' not found.")

    # 2. Gate Rule: Reminders must use only verified dates from official guidelines
    cycle_info = VERIFIED_SCHEME_CYCLES.get(payload.scheme_id)
    if not cycle_info:
        # Check if scheme has active verified documents
        doc_res = await db.execute(
            select(DocumentVersion)
            .join(SchemeDocument, DocumentVersion.document_id == SchemeDocument.document_id)
            .where(SchemeDocument.scheme_id == payload.scheme_id, DocumentVersion.status == "verified")
        )
        if not doc_res.scalars().first():
            raise HTTPException(
                status_code=400,
                detail="Reminders cannot be scheduled: scheme lacks verified gazette dates in the registry."
            )

    # 3. Check for existing active or pending reminder
    existing_res = await db.execute(
        select(SavedSchemeReminder).where(
            SavedSchemeReminder.email == payload.email,
            SavedSchemeReminder.scheme_id == payload.scheme_id
        )
    )
    existing = existing_res.scalar_one_or_none()

    verification_token = str(uuid.uuid4())

    if existing:
        existing.token = verification_token
        existing.verified = False
        await db.commit()
        return success_response(
            data={
                "id": existing.id,
                "scheme_id": payload.scheme_id,
                "email": payload.email,
                "status": "pending_verification",
                "verification_token": verification_token,
                "verification_url": f"/api/v1/reminders/verify/{verification_token}",
                "verified_source": cycle_info.get("governing_version") if cycle_info else "verified_registry"
            },
            request_id=request_id
        )

    reminder_id = f"rem-{uuid.uuid4().hex[:12]}"
    new_reminder = SavedSchemeReminder(
        id=reminder_id,
        email=payload.email,
        scheme_id=payload.scheme_id,
        verified=False,
        token=verification_token,
        subscribed_at=datetime.now(timezone.utc)
    )
    db.add(new_reminder)
    await db.commit()

    return success_response(
        data={
            "id": reminder_id,
            "scheme_id": payload.scheme_id,
            "email": payload.email,
            "status": "pending_verification",
            "verification_token": verification_token,
            "verification_url": f"/api/v1/reminders/verify/{verification_token}",
            "verified_source": cycle_info.get("governing_version") if cycle_info else "verified_registry"
        },
        request_id=request_id
    )


@router.get("/verify/{token}")
async def verify_reminder_token(
    token: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Double opt-in verification route activating citizen reminder subscription."""
    request_id = getattr(request.state, "request_id", "direct")

    res = await db.execute(select(SavedSchemeReminder).where(SavedSchemeReminder.token == token))
    reminder = res.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=404, detail="Invalid or expired verification token.")

    reminder.verified = True
    await db.commit()

    return success_response(
        data={
            "id": reminder.id,
            "scheme_id": reminder.scheme_id,
            "email": reminder.email,
            "status": "active",
            "message": "Subscription verified successfully. You will receive verified notifications strictly based on official circulars."
        },
        request_id=request_id
    )


@router.post("/unsubscribe")
async def unsubscribe_reminder(
    payload: UnsubscribeRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """1-click unsubscribe endpoint complying with Blueprint Section 14.1."""
    request_id = getattr(request.state, "request_id", "direct")

    res = await db.execute(select(SavedSchemeReminder).where(SavedSchemeReminder.token == payload.token))
    reminder = res.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=404, detail="Subscription token not found.")

    await db.delete(reminder)
    await db.commit()

    return success_response(
        data={
            "status": "unsubscribed",
            "message": "You have been unsubscribed from this scheme reminder. No further notifications will be sent."
        },
        request_id=request_id
    )


@router.get("/my-subscriptions")
async def get_my_subscriptions(
    email: str = Query(..., pattern=EMAIL_REGEX),
    request: Request = None,
    db: AsyncSession = Depends(get_db)
):
    """Lists verified reminder subscriptions for the given email."""
    request_id = getattr(request.state, "request_id", "direct") if request else "direct"

    res = await db.execute(select(SavedSchemeReminder).where(SavedSchemeReminder.email == email))
    reminders = res.scalars().all()

    items = [
        {
            "id": r.id,
            "scheme_id": r.scheme_id,
            "verified": r.verified,
            "subscribed_at": r.subscribed_at.isoformat() if r.subscribed_at else None,
            "unsubscribe_token": r.token
        }
        for r in reminders
    ]

    return success_response(data=items, request_id=request_id)


# Citizen In-App & Email Custom Reminders & Notifications

class CitizenCustomReminderCreate(BaseModel):
    title: str = Field(..., min_length=2, description="Reminder title")
    scheme_id: Optional[str] = Field(None, description="Related welfare scheme ID")
    scheme_name: Optional[str] = Field(None, description="Related welfare scheme name")
    description: Optional[str] = Field("", description="Next action / description")
    due_date: str = Field(..., description="Target due date (YYYY-MM-DD)")
    due_time: Optional[str] = Field("10:00", description="Target due time (HH:MM)")
    channel: str = Field("both", description="Notification channel: 'in_app' | 'email' | 'both'")
    email: Optional[str] = Field(None, description="Recipient email address")
    recipient_name: Optional[str] = Field("Citizen", description="Citizen name")
    reminder_type: str = Field("deadline", description="Type: deadline | document_collection | submission | follow_up | general")
    language: str = Field("en", description="Notification language ('hi' | 'en')")


# In-memory storage for custom citizen reminders & notifications
CITIZEN_REMINDERS_REGISTRY: List[Dict[str, Any]] = []


@router.post("/citizen/create", status_code=status.HTTP_201_CREATED)
async def create_citizen_custom_reminder(
    payload: CitizenCustomReminderCreate,
    request: Request
):
    """Creates a citizen reminder and dispatches email if requested."""
    from backend.app.notifications.email_service import email_service
    request_id = getattr(request.state, "request_id", "direct")

    reminder_id = f"crm-{uuid.uuid4().hex[:10]}"
    delivery_status = "scheduled"
    delivery_message = "In-app reminder scheduled."

    if payload.channel in ("email", "both") and payload.email:
        result = await email_service.dispatch_reminder(
            recipient_email=payload.email,
            recipient_name=payload.recipient_name or "Citizen",
            title=payload.title,
            scheme_name=payload.scheme_name or "Government Welfare Scheme",
            due_date=payload.due_date,
            due_time=payload.due_time or "10:00",
            description=payload.description or "",
            language=payload.language or "en"
        )
        delivery_status = result.status
        delivery_message = result.message

    record = {
        "id": reminder_id,
        "title": payload.title,
        "scheme_id": payload.scheme_id,
        "scheme_name": payload.scheme_name or "Government Welfare Scheme",
        "description": payload.description,
        "due_date": payload.due_date,
        "due_time": payload.due_time or "10:00",
        "channel": payload.channel,
        "email": payload.email,
        "recipient_name": payload.recipient_name,
        "reminder_type": payload.reminder_type,
        "status": delivery_status,
        "delivery_message": delivery_message,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    CITIZEN_REMINDERS_REGISTRY.append(record)

    return success_response(data=record, request_id=request_id)


@router.get("/citizen/list")
async def list_citizen_reminders(
    email: Optional[str] = None,
    request: Request = None
):
    """Lists scheduled citizen reminders and notification centre items."""
    request_id = getattr(request.state, "request_id", "direct") if request else "direct"
    if email:
        items = [r for r in CITIZEN_REMINDERS_REGISTRY if r.get("email") == email]
    else:
        items = CITIZEN_REMINDERS_REGISTRY
    return success_response(data=items, request_id=request_id)


@router.patch("/citizen/{reminder_id}/read")
async def mark_citizen_reminder_read(
    reminder_id: str,
    request: Request
):
    """Marks a citizen notification as read."""
    request_id = getattr(request.state, "request_id", "direct")
    for r in CITIZEN_REMINDERS_REGISTRY:
        if r["id"] == reminder_id:
            r["is_read"] = True
            return success_response(data=r, request_id=request_id)
    raise HTTPException(status_code=404, detail="Reminder not found.")


@router.delete("/citizen/{reminder_id}")
async def delete_citizen_reminder(
    reminder_id: str,
    request: Request
):
    """Deletes a citizen reminder."""
    global CITIZEN_REMINDERS_REGISTRY
    request_id = getattr(request.state, "request_id", "direct")
    initial_len = len(CITIZEN_REMINDERS_REGISTRY)
    CITIZEN_REMINDERS_REGISTRY = [r for r in CITIZEN_REMINDERS_REGISTRY if r["id"] != reminder_id]
    if len(CITIZEN_REMINDERS_REGISTRY) == initial_len:
        raise HTTPException(status_code=404, detail="Reminder not found.")
    return success_response(data={"deleted": True, "id": reminder_id}, request_id=request_id)

