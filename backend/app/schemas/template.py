from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TemplateSlotCreate(BaseModel):
    slot_key: str
    slot_type: str
    default_prompt: Optional[str] = None
    fixed_content_ec: Optional[str] = None
    fixed_content_rakuten: Optional[str] = None
    sort_order: int = 0


class TemplateSlotRead(BaseModel):
    id: int
    template_id: int
    slot_key: str
    slot_type: str
    default_prompt: Optional[str] = None
    fixed_content_ec: Optional[str] = None
    fixed_content_rakuten: Optional[str] = None
    sort_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


class TemplateCreate(BaseModel):
    client_id: Optional[int] = None
    name: str
    base_html: str
    thumbnail: Optional[str] = None


class TemplateRead(BaseModel):
    id: int
    client_id: Optional[int] = None
    name: str
    base_html: str
    thumbnail: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    slots: list[TemplateSlotRead] = []

    model_config = {"from_attributes": True}
