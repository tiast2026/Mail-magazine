from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.newsletter import GeneratedNewsletter
from app.schemas.newsletter import (
    GenerateRequest,
    GenerateResponse,
    RegenerateSlotRequest,
    SuggestSubjectRequest,
    SuggestSubjectResponse,
)
from app.services.generation import generate_newsletter, regenerate_slot, suggest_subjects

router = APIRouter()


@router.post("/", response_model=GenerateResponse, status_code=201)
async def generate(request: GenerateRequest, db: AsyncSession = Depends(get_db)):
    newsletter = await generate_newsletter(request, db)
    return newsletter


@router.post("/{newsletter_id}/regenerate-slot", response_model=GenerateResponse)
async def regenerate_slot_endpoint(
    newsletter_id: int,
    request: RegenerateSlotRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GeneratedNewsletter).where(GeneratedNewsletter.id == newsletter_id)
    )
    newsletter = result.scalar_one_or_none()
    if not newsletter:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    updated = await regenerate_slot(newsletter, request.slot_key, request.instruction, db)
    return updated


@router.post("/suggest-subject", response_model=SuggestSubjectResponse)
async def suggest_subject_endpoint(
    request: SuggestSubjectRequest,
    db: AsyncSession = Depends(get_db),
):
    subjects = await suggest_subjects(request, db)
    return SuggestSubjectResponse(subjects=subjects)
