from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.models.newsletter import GeneratedNewsletter
from app.schemas.newsletter import GeneratedNewsletterRead, GeneratedNewsletterUpdate

router = APIRouter()


@router.get("/", response_model=list[GeneratedNewsletterRead])
async def list_newsletters(
    client_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(GeneratedNewsletter)
    if client_id is not None:
        query = query.where(GeneratedNewsletter.client_id == client_id)
    if status is not None:
        query = query.where(GeneratedNewsletter.status == status)
    query = query.order_by(GeneratedNewsletter.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{newsletter_id}", response_model=GeneratedNewsletterRead)
async def get_newsletter(newsletter_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(GeneratedNewsletter).where(GeneratedNewsletter.id == newsletter_id)
    )
    newsletter = result.scalar_one_or_none()
    if not newsletter:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    return newsletter


@router.put("/{newsletter_id}", response_model=GeneratedNewsletterRead)
async def update_newsletter(
    newsletter_id: int,
    data: GeneratedNewsletterUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GeneratedNewsletter).where(GeneratedNewsletter.id == newsletter_id)
    )
    newsletter = result.scalar_one_or_none()
    if not newsletter:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(newsletter, key, value)
    await db.flush()
    await db.refresh(newsletter)
    return newsletter


@router.delete("/{newsletter_id}", status_code=204)
async def delete_newsletter(newsletter_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(GeneratedNewsletter).where(GeneratedNewsletter.id == newsletter_id)
    )
    newsletter = result.scalar_one_or_none()
    if not newsletter:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    await db.delete(newsletter)
    await db.flush()
