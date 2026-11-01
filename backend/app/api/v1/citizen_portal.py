"""Citizen Portal & Persistence API Endpoints.

Provides server-side source-of-truth persistence for:
- Citizen Demographic, Geographic, and Socio-Economic Profiles
- 7-Step Questionnaire In-Progress State (Save & Resume)
- Deterministic Assessment Submissions & Audit History
- Citizen Saved Schemes (Bookmarks & Reminders)
- Application Tracking with Multi-Stage Status Timelines
"""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.envelope import error_response, success_response
from backend.app.db.base import utc_now
from backend.app.db.models import (
    ApplicationTrackerRecord,
    AssessmentHistory,
    AssessmentResponse,
    CitizenProfile,
    CitizenSavedScheme,
    Scheme
)
from backend.app.db.session import get_db
from backend.app.eligibility.service import eligibility_service

router = APIRouter(prefix="/citizen", tags=["Citizen Portal & Persistence"])


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------

class ProfileUpdateRequest(BaseModel):
    user_identifier: str = Field("citizen-default", description="Citizen account identifier")
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    language: Optional[str] = "hi"
    age: Optional[int] = None
    gender: Optional[str] = None
    marital_status: Optional[str] = None
    caste_category: Optional[str] = None
    minority_status: Optional[bool] = None
    is_differently_abled: Optional[bool] = None
    disability_percentage: Optional[int] = None
    has_disability_certificate: Optional[bool] = None
    state: Optional[str] = None
    district: Optional[str] = None
    pincode: Optional[str] = None
    area_type: Optional[str] = None
    is_rural_resident: Optional[bool] = None
    domicile_status: Optional[str] = None
    annual_income: Optional[float] = None
    is_bpl: Optional[bool] = None
    ration_card_type: Optional[str] = None
    is_income_tax_payer: Optional[bool] = None
    secc_deprived: Optional[bool] = None
    employment_type: Optional[str] = None
    occupation: Optional[str] = None
    is_unorganized_worker: Optional[bool] = None
    is_institutional_landholder: Optional[bool] = None
    is_constitutional_post_holder: Optional[bool] = None
    is_farmer: Optional[bool] = None
    owns_cultivable_land: Optional[bool] = None
    landholding_acres: Optional[float] = None
    land_ownership_type: Optional[str] = None
    crop_types: Optional[List[str]] = None
    highest_education: Optional[str] = None
    is_student: Optional[bool] = None
    current_course: Optional[str] = None
    institution_type: Optional[str] = None
    percentile_score: Optional[float] = None
    is_regular_college_student: Optional[bool] = None
    has_aadhaar: Optional[bool] = None
    has_jan_dhan_account: Optional[bool] = None
    has_ration_card: Optional[bool] = None
    has_land_records: Optional[bool] = None
    has_income_certificate: Optional[bool] = None
    has_caste_certificate: Optional[bool] = None
    has_pucca_house: Optional[bool] = None
    ekyc_completed: Optional[bool] = None
    completed_steps: Optional[List[str]] = None
    raw_attributes: Optional[Dict[str, Any]] = None


class SaveAssessmentRequest(BaseModel):
    user_identifier: str = Field("citizen-default", description="Citizen account identifier")
    current_step: int = Field(1, ge=1, le=7, description="Current step index 1 to 7")
    answers: Dict[str, Any] = Field(..., description="Key-value question responses")


class SubmitAssessmentRequest(BaseModel):
    user_identifier: str = Field("citizen-default", description="Citizen account identifier")
    answers: Dict[str, Any] = Field(..., description="Complete profile answers dictionary")


class SaveSchemeRequest(BaseModel):
    user_identifier: str = Field("citizen-default", description="Citizen account identifier")
    scheme_id: str = Field(..., description="Target scheme identifier")
    notes: Optional[str] = None
    status: Optional[str] = "saved"


class TrackApplicationRequest(BaseModel):
    user_identifier: str = Field("citizen-default", description="Citizen account identifier")
    scheme_id: str = Field(..., description="Scheme identifier")
    application_reference: str = Field(..., description="Official government tracking reference")
    portal_name: str = Field(..., description="Authority / CSC portal name")
    current_status: str = Field("submitted", description="Status string")
    remarks: Optional[str] = None


# ---------------------------------------------------------------------------
# Helper: Get or Create Citizen Profile
# ---------------------------------------------------------------------------

async def _get_or_create_profile(db: AsyncSession, identifier: str) -> CitizenProfile:
    res = await db.execute(
        select(CitizenProfile).where(CitizenProfile.user_identifier == identifier)
    )
    profile = res.scalar_one_or_none()
    if not profile:
        profile = CitizenProfile(
            id=f"cit-{uuid.uuid4().hex[:12]}",
            user_identifier=identifier,
            full_name="Rajesh Sharma",
            phone="9876543210",
            email="rajesh.sharma@example.gov.in",
            language="hi",
            state="UK",
            district="Dehradun",
            pincode="248001",
            area_type="rural",
            is_rural_resident=True,
            age=46,
            gender="male",
            marital_status="married",
            caste_category="obc",
            minority_status=False,
            is_differently_abled=False,
            annual_income=96000.0,
            is_bpl=True,
            ration_card_type="bpl",
            is_income_tax_payer=False,
            employment_type="daily_wage",
            occupation="Smallholder Farmer / Laborer",
            is_unorganized_worker=True,
            is_farmer=True,
            owns_cultivable_land=True,
            landholding_acres=1.8,
            land_ownership_type="individual",
            crop_types=["Wheat", "Paddy"],
            highest_education="secondary",
            is_student=False,
            has_aadhaar=True,
            has_jan_dhan_account=True,
            has_ration_card=True,
            has_land_records=True,
            has_income_certificate=True,
            has_caste_certificate=True,
            has_pucca_house=False,
            ekyc_completed=True,
            completed_steps=["personal", "residential", "financial", "employment", "agricultural", "education", "documents"]
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    return profile


def _serialize_profile(p: CitizenProfile) -> Dict[str, Any]:
    return {
        "id": p.id,
        "user_identifier": p.user_identifier,
        "full_name": p.full_name,
        "phone": p.phone,
        "email": p.email,
        "language": p.language,
        "age": p.age,
        "gender": p.gender,
        "marital_status": p.marital_status,
        "caste_category": p.caste_category,
        "minority_status": p.minority_status,
        "is_differently_abled": p.is_differently_abled,
        "disability_percentage": p.disability_percentage,
        "has_disability_certificate": p.has_disability_certificate,
        "state": p.state,
        "district": p.district,
        "pincode": p.pincode,
        "area_type": p.area_type,
        "is_rural_resident": p.is_rural_resident,
        "domicile_status": p.domicile_status,
        "annual_income": p.annual_income,
        "is_bpl": p.is_bpl,
        "ration_card_type": p.ration_card_type,
        "is_income_tax_payer": p.is_income_tax_payer,
        "secc_deprived": p.secc_deprived,
        "employment_type": p.employment_type,
        "occupation": p.occupation,
        "is_unorganized_worker": p.is_unorganized_worker,
        "is_institutional_landholder": p.is_institutional_landholder,
        "is_constitutional_post_holder": p.is_constitutional_post_holder,
        "is_farmer": p.is_farmer,
        "owns_cultivable_land": p.owns_cultivable_land,
        "landholding_acres": p.landholding_acres,
        "land_ownership_type": p.land_ownership_type,
        "crop_types": p.crop_types or [],
        "highest_education": p.highest_education,
        "is_student": p.is_student,
        "current_course": p.current_course,
        "institution_type": p.institution_type,
        "percentile_score": p.percentile_score,
        "is_regular_college_student": p.is_regular_college_student,
        "has_aadhaar": p.has_aadhaar,
        "has_jan_dhan_account": p.has_jan_dhan_account,
        "has_ration_card": p.has_ration_card,
        "has_land_records": p.has_land_records,
        "has_income_certificate": p.has_income_certificate,
        "has_caste_certificate": p.has_caste_certificate,
        "has_pucca_house": p.has_pucca_house,
        "ekyc_completed": p.ekyc_completed,
        "completed_steps": p.completed_steps or [],
        "raw_attributes": p.raw_attributes or {},
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None
    }


# ---------------------------------------------------------------------------
# Citizen Profile APIs
# ---------------------------------------------------------------------------

@router.get("/profile")
async def get_citizen_profile(
    request: Request,
    identifier: str = Query("citizen-default", description="User identifier"),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves or provisions the citizen's persistent database profile."""
    request_id = getattr(request.state, "request_id", "direct")
    profile = await _get_or_create_profile(db, identifier)
    return success_response(
        data=_serialize_profile(profile),
        request_id=request_id
    )


@router.put("/profile")
async def update_citizen_profile(
    payload: ProfileUpdateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Updates attributes of the citizen's profile and returns the new state."""
    request_id = getattr(request.state, "request_id", "direct")
    profile = await _get_or_create_profile(db, payload.user_identifier)

    update_fields = payload.model_dump(exclude_unset=True, exclude={"user_identifier"})
    for key, val in update_fields.items():
        if hasattr(profile, key):
            setattr(profile, key, val)

    profile.updated_at = utc_now()
    await db.commit()
    await db.refresh(profile)

    return success_response(
        data=_serialize_profile(profile),
        request_id=request_id
    )


# ---------------------------------------------------------------------------
# Assessment (Questionnaire) Save & Resume APIs
# ---------------------------------------------------------------------------

@router.post("/assessment/save")
async def save_assessment_progress(
    payload: SaveAssessmentRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Saves questionnaire progress and partial answers for save-and-resume."""
    request_id = getattr(request.state, "request_id", "direct")
    profile = await _get_or_create_profile(db, payload.user_identifier)

    # Check for existing in-progress response
    res = await db.execute(
        select(AssessmentResponse)
        .where(
            AssessmentResponse.profile_id == profile.id,
            AssessmentResponse.status == "in_progress"
        )
        .order_by(desc(AssessmentResponse.created_at))
    )
    existing = res.scalar_one_or_none()

    if existing:
        merged = dict(existing.answers_json or {})
        merged.update(payload.answers)
        existing.answers_json = merged
        existing.current_step = payload.current_step
        existing.updated_at = utc_now()
        assessment_id = existing.id
    else:
        new_resp = AssessmentResponse(
            id=f"asmt-{uuid.uuid4().hex[:12]}",
            profile_id=profile.id,
            current_step=payload.current_step,
            status="in_progress",
            answers_json=payload.answers
        )
        db.add(new_resp)
        assessment_id = new_resp.id

    # Also sync answered keys onto the profile
    for k, v in payload.answers.items():
        if hasattr(profile, k) and v not in ["not_sure", "unknown", None]:
            setattr(profile, k, v)

    await db.commit()

    return success_response(
        data={
            "assessment_id": assessment_id,
            "current_step": payload.current_step,
            "status": "in_progress",
            "saved_fields_count": len(payload.answers),
            "timestamp": utc_now().isoformat()
        },
        request_id=request_id
    )


@router.get("/assessment/load")
async def load_assessment_progress(
    request: Request,
    identifier: str = Query("citizen-default", description="User identifier"),
    db: AsyncSession = Depends(get_db)
):
    """Loads the citizen's latest in-progress questionnaire response to resume."""
    request_id = getattr(request.state, "request_id", "direct")
    profile = await _get_or_create_profile(db, identifier)

    res = await db.execute(
        select(AssessmentResponse)
        .where(
            AssessmentResponse.profile_id == profile.id,
            AssessmentResponse.status == "in_progress"
        )
        .order_by(desc(AssessmentResponse.created_at))
    )
    assessment = res.scalar_one_or_none()

    # Prepopulate with profile data if no explicit in_progress response exists
    base_answers = {}
    if assessment and assessment.answers_json:
        base_answers = dict(assessment.answers_json)
    else:
        # Build from profile attributes
        profile_dict = _serialize_profile(profile)
        for k, v in profile_dict.items():
            if v is not None and k not in ["id", "user_identifier", "created_at", "updated_at"]:
                base_answers[k] = v

    return success_response(
        data={
            "has_saved_state": assessment is not None,
            "current_step": assessment.current_step if assessment else 1,
            "answers": base_answers,
            "profile": _serialize_profile(profile)
        },
        request_id=request_id
    )


# ---------------------------------------------------------------------------
# Assessment Submission & Deterministic Evaluation
# ---------------------------------------------------------------------------

@router.post("/assessment/submit")
async def submit_assessment(
    payload: SubmitAssessmentRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Executes deterministic evaluation across all schemes, saves evaluation run, and returns ranked results."""
    request_id = getattr(request.state, "request_id", "direct")
    profile = await _get_or_create_profile(db, payload.user_identifier)

    # 1. Update Profile in DB with submitted answers
    for k, v in payload.answers.items():
        if hasattr(profile, k) and v not in ["not_sure", "unknown", None]:
            setattr(profile, k, v)
    profile.raw_attributes = payload.answers
    profile.completed_steps = [
        "personal", "residential", "financial", "employment",
        "agricultural", "education", "documents"
    ]
    profile.updated_at = utc_now()

    # 2. Mark any in_progress AssessmentResponse as completed
    res = await db.execute(
        select(AssessmentResponse)
        .where(
            AssessmentResponse.profile_id == profile.id,
            AssessmentResponse.status == "in_progress"
        )
    )
    for active_resp in res.scalars().all():
        active_resp.status = "completed"
        active_resp.answers_json = payload.answers
        active_resp.updated_at = utc_now()

    # 3. Deterministic evaluation through Python evaluator
    ranked_schemes = await eligibility_service.evaluate_profile(
        db=db,
        profile=payload.answers
    )

    counts = {
        "Eligible": 0,
        "Likely Eligible": 0,
        "Need More Information": 0,
        "Not Eligible": 0
    }
    for item in ranked_schemes:
        tier = item.tier
        if tier in counts:
            counts[tier] += 1

    # 4. Save into AssessmentHistory audit table
    history_record = AssessmentHistory(
        id=f"hist-{uuid.uuid4().hex[:12]}",
        profile_id=profile.id,
        total_schemes_evaluated=len(ranked_schemes),
        eligible_count=counts["Eligible"],
        likely_eligible_count=counts["Likely Eligible"],
        more_info_count=counts["Need More Information"],
        not_eligible_count=counts["Not Eligible"],
        counts_json=counts,
        ranked_schemes_json=[item.to_dict() for item in ranked_schemes],
        evaluated_at=utc_now()
    )
    db.add(history_record)
    await db.commit()

    return success_response(
        data={
            "history_id": history_record.id,
            "total_schemes_evaluated": len(ranked_schemes),
            "counts": counts,
            "ranked_schemes": [item.to_dict() for item in ranked_schemes],
            "evaluated_at": history_record.evaluated_at.isoformat()
        },
        request_id=request_id
    )


@router.get("/assessment/history")
async def get_assessment_history(
    request: Request,
    identifier: str = Query("citizen-default", description="User identifier"),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves past evaluation history runs for the citizen."""
    request_id = getattr(request.state, "request_id", "direct")
    profile = await _get_or_create_profile(db, identifier)

    res = await db.execute(
        select(AssessmentHistory)
        .where(AssessmentHistory.profile_id == profile.id)
        .order_by(desc(AssessmentHistory.evaluated_at))
        .limit(10)
    )
    history_rows = res.scalars().all()

    return success_response(
        data=[
            {
                "id": h.id,
                "total_schemes_evaluated": h.total_schemes_evaluated,
                "counts": h.counts_json or {
                    "Eligible": h.eligible_count,
                    "Likely Eligible": h.likely_eligible_count,
                    "Need More Information": h.more_info_count,
                    "Not Eligible": h.not_eligible_count
                },
                "evaluated_at": h.evaluated_at.isoformat() if h.evaluated_at else None
            }
            for h in history_rows
        ],
        request_id=request_id
    )


# ---------------------------------------------------------------------------
# Saved Schemes (Bookmarks) APIs
# ---------------------------------------------------------------------------

@router.get("/schemes/saved")
async def get_saved_schemes(
    request: Request,
    identifier: str = Query("citizen-default", description="User identifier"),
    db: AsyncSession = Depends(get_db)
):
    """Fetches all bookmarked schemes with hydrated metadata."""
    request_id = getattr(request.state, "request_id", "direct")
    profile = await _get_or_create_profile(db, identifier)

    query = (
        select(CitizenSavedScheme, Scheme)
        .join(Scheme, CitizenSavedScheme.scheme_id == Scheme.scheme_id)
        .where(CitizenSavedScheme.profile_id == profile.id)
        .order_by(desc(CitizenSavedScheme.created_at))
    )
    res = await db.execute(query)
    rows = res.all()

    items = []
    for saved, scheme in rows:
        items.append({
            "saved_id": saved.id,
            "scheme_id": scheme.scheme_id,
            "code": scheme.code,
            "name_en": scheme.name_en,
            "name_hi": scheme.name_hi,
            "category": scheme.category,
            "level": scheme.level,
            "ministry_or_dept": scheme.ministry_or_dept,
            "benefits_summary_en": scheme.benefits_summary_en,
            "benefits_summary_hi": scheme.benefits_summary_hi,
            "status": saved.status,
            "notes": saved.notes,
            "deadline": saved.deadline.isoformat() if saved.deadline else None,
            "saved_at": saved.created_at.isoformat() if saved.created_at else None
        })

    return success_response(data=items, request_id=request_id)


@router.post("/schemes/save")
async def save_scheme(
    payload: SaveSchemeRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Adds a scheme to the citizen's saved list."""
    request_id = getattr(request.state, "request_id", "direct")
    profile = await _get_or_create_profile(db, payload.user_identifier)

    # Check scheme exists
    scheme_res = await db.execute(select(Scheme).where(Scheme.scheme_id == payload.scheme_id))
    scheme = scheme_res.scalar_one_or_none()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    # Check if already saved
    existing_res = await db.execute(
        select(CitizenSavedScheme).where(
            CitizenSavedScheme.profile_id == profile.id,
            CitizenSavedScheme.scheme_id == payload.scheme_id
        )
    )
    existing = existing_res.scalar_one_or_none()

    if existing:
        existing.status = payload.status or existing.status
        existing.notes = payload.notes or existing.notes
        existing.updated_at = utc_now()
        await db.commit()
        return success_response(data={"message": "Saved scheme updated", "saved_id": existing.id}, request_id=request_id)

    new_saved = CitizenSavedScheme(
        id=f"save-{uuid.uuid4().hex[:12]}",
        profile_id=profile.id,
        scheme_id=payload.scheme_id,
        status=payload.status or "saved",
        notes=payload.notes
    )
    db.add(new_saved)
    await db.commit()

    return success_response(
        data={"message": "Scheme bookmarked successfully", "saved_id": new_saved.id},
        request_id=request_id
    )


@router.delete("/schemes/save/{scheme_id}")
async def remove_saved_scheme(
    scheme_id: str,
    request: Request,
    identifier: str = Query("citizen-default", description="User identifier"),
    db: AsyncSession = Depends(get_db)
):
    """Removes a scheme from citizen saved list."""
    request_id = getattr(request.state, "request_id", "direct")
    profile = await _get_or_create_profile(db, identifier)

    await db.execute(
        delete(CitizenSavedScheme).where(
            CitizenSavedScheme.profile_id == profile.id,
            CitizenSavedScheme.scheme_id == scheme_id
        )
    )
    await db.commit()

    return success_response(data={"message": "Scheme removed from saved list"}, request_id=request_id)


# ---------------------------------------------------------------------------
# Application Tracker APIs
# ---------------------------------------------------------------------------

@router.get("/applications")
async def get_applications(
    request: Request,
    identifier: str = Query("citizen-default", description="User identifier"),
    db: AsyncSession = Depends(get_db)
):
    """Lists citizen tracked applications with milestones."""
    request_id = getattr(request.state, "request_id", "direct")
    profile = await _get_or_create_profile(db, identifier)

    query = (
        select(ApplicationTrackerRecord, Scheme)
        .join(Scheme, ApplicationTrackerRecord.scheme_id == Scheme.scheme_id)
        .where(ApplicationTrackerRecord.profile_id == profile.id)
        .order_by(desc(ApplicationTrackerRecord.last_status_update))
    )
    res = await db.execute(query)
    rows = res.all()

    # Pre-seed sample active application if table is currently empty for demonstration
    if not rows:
        sample_app = ApplicationTrackerRecord(
            id=f"app-{uuid.uuid4().hex[:12]}",
            profile_id=profile.id,
            scheme_id="SCHEME-PM-KISAN",
            application_reference="UK/2026/KISAN/984712",
            portal_name="PM-KISAN National Portal & CSC Dehradun",
            current_status="field_verification",
            submission_date=utc_now(),
            last_status_update=utc_now(),
            timeline_steps_json=[
                {"title": "Online Registration Submitted", "completed": True, "date": "2026-10-15"},
                {"title": "Aadhaar e-KYC Verification Completed", "completed": True, "date": "2026-10-18"},
                {"title": "District Patwari Land Seeding & Field Verification", "completed": True, "date": "2026-10-28"},
                {"title": "State Nodal Officer Approval", "completed": False, "date": "Estimated: 2026-11-05"},
                {"title": "PFMS DBT Installment Release (₹2,000)", "completed": False, "date": "Upcoming Cycle"}
            ],
            remarks="Land records (Khatauni) verified by Tehsil office. Awaiting state approval."
        )
        db.add(sample_app)
        await db.commit()
        # Refetch
        res = await db.execute(query)
        rows = res.all()

    items = []
    for app_record, scheme in rows:
        items.append({
            "id": app_record.id,
            "scheme_id": scheme.scheme_id,
            "scheme_name_en": scheme.name_en,
            "scheme_name_hi": scheme.name_hi,
            "application_reference": app_record.application_reference,
            "portal_name": app_record.portal_name,
            "current_status": app_record.current_status,
            "submission_date": app_record.submission_date.isoformat() if app_record.submission_date else None,
            "last_status_update": app_record.last_status_update.isoformat() if app_record.last_status_update else None,
            "timeline_steps": app_record.timeline_steps_json or [],
            "remarks": app_record.remarks
        })

    return success_response(data=items, request_id=request_id)


@router.post("/applications")
async def track_application(
    payload: TrackApplicationRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Adds a new application to track."""
    request_id = getattr(request.state, "request_id", "direct")
    profile = await _get_or_create_profile(db, payload.user_identifier)

    timeline = [
        {"title": "Application Submitted to Portal", "completed": True, "date": utc_now().strftime("%Y-%m-%d")},
        {"title": "Document Verification / Scrutiny", "completed": False, "date": "In Progress"},
        {"title": "Field Verification / Nodal Approval", "completed": False, "date": "Pending"},
        {"title": "Sanction Order & Direct Benefit Release", "completed": False, "date": "Pending"}
    ]

    record = ApplicationTrackerRecord(
        id=f"app-{uuid.uuid4().hex[:12]}",
        profile_id=profile.id,
        scheme_id=payload.scheme_id,
        application_reference=payload.application_reference,
        portal_name=payload.portal_name,
        current_status=payload.current_status,
        submission_date=utc_now(),
        last_status_update=utc_now(),
        timeline_steps_json=timeline,
        remarks=payload.remarks
    )
    db.add(record)
    await db.commit()

    return success_response(
        data={"message": "Application tracked successfully", "id": record.id},
        request_id=request_id
    )

