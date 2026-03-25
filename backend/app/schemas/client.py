from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class ClientCreate(BaseModel):
    name: str
    industry: Optional[str] = None
    tone_description: Optional[str] = None
    mall_settings: Optional[dict[str, Any]] = None


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    tone_description: Optional[str] = None
    mall_settings: Optional[dict[str, Any]] = None


class ClientRead(BaseModel):
    id: int
    name: str
    industry: Optional[str] = None
    tone_description: Optional[str] = None
    mall_settings: Optional[dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ClientMallSettingCreate(BaseModel):
    mall_type: str
    base_url: Optional[str] = None
    image_base_url: Optional[str] = None
    html_rules: Optional[dict[str, Any]] = None
    footer_html: Optional[str] = None


class ClientMallSettingRead(BaseModel):
    id: int
    client_id: int
    mall_type: str
    base_url: Optional[str] = None
    image_base_url: Optional[str] = None
    html_rules: Optional[dict[str, Any]] = None
    footer_html: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
