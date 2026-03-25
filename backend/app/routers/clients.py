from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.client import Client, ClientMallSetting
from app.schemas.client import (
    ClientCreate,
    ClientMallSettingCreate,
    ClientMallSettingRead,
    ClientRead,
    ClientUpdate,
)

router = APIRouter()


@router.get("/", response_model=list[ClientRead])
async def list_clients(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Client).order_by(Client.created_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=ClientRead, status_code=201)
async def create_client(data: ClientCreate, db: AsyncSession = Depends(get_db)):
    client = Client(
        name=data.name,
        industry=data.industry,
        tone_description=data.tone_description,
        mall_settings=data.mall_settings,
    )
    db.add(client)
    await db.flush()
    await db.refresh(client)
    return client


@router.get("/{client_id}", response_model=ClientRead)
async def get_client(client_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.put("/{client_id}", response_model=ClientRead)
async def update_client(
    client_id: int, data: ClientUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(client, key, value)
    await db.flush()
    await db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=204)
async def delete_client(client_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    await db.delete(client)
    await db.flush()


@router.get("/{client_id}/mall-settings", response_model=list[ClientMallSettingRead])
async def list_mall_settings(client_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    result = await db.execute(
        select(ClientMallSetting)
        .where(ClientMallSetting.client_id == client_id)
        .order_by(ClientMallSetting.created_at.desc())
    )
    return result.scalars().all()


@router.post(
    "/{client_id}/mall-settings",
    response_model=ClientMallSettingRead,
    status_code=201,
)
async def create_mall_setting(
    client_id: int,
    data: ClientMallSettingCreate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    setting = ClientMallSetting(
        client_id=client_id,
        mall_type=data.mall_type,
        base_url=data.base_url,
        image_base_url=data.image_base_url,
        html_rules=data.html_rules,
        footer_html=data.footer_html,
    )
    db.add(setting)
    await db.flush()
    await db.refresh(setting)
    return setting
