from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import Optional

from app.database import get_db
from app.models.template import Template, TemplateSlot
from app.schemas.template import TemplateCreate, TemplateRead, TemplateSlotCreate, TemplateSlotRead

router = APIRouter()


@router.get("/", response_model=list[TemplateRead])
async def list_templates(
    client_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Template).options(selectinload(Template.slots))
    if client_id is not None:
        query = query.where(
            (Template.client_id == client_id) | (Template.client_id.is_(None))
        )
    query = query.order_by(Template.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=TemplateRead, status_code=201)
async def create_template(data: TemplateCreate, db: AsyncSession = Depends(get_db)):
    template = Template(
        client_id=data.client_id,
        name=data.name,
        base_html=data.base_html,
        thumbnail=data.thumbnail,
    )
    db.add(template)
    await db.flush()
    await db.refresh(template, attribute_names=["slots"])
    return template


@router.get("/{template_id}", response_model=TemplateRead)
async def get_template(template_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Template)
        .options(selectinload(Template.slots))
        .where(Template.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.post("/{template_id}/slots", response_model=TemplateSlotRead, status_code=201)
async def create_slot(
    template_id: int,
    data: TemplateSlotCreate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Template).where(Template.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    slot = TemplateSlot(
        template_id=template_id,
        slot_key=data.slot_key,
        slot_type=data.slot_type,
        default_prompt=data.default_prompt,
        fixed_content_ec=data.fixed_content_ec,
        fixed_content_rakuten=data.fixed_content_rakuten,
        sort_order=data.sort_order,
    )
    db.add(slot)
    await db.flush()
    await db.refresh(slot)
    return slot
