from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class GenerateRequest(BaseModel):
    client_id: int
    template_id: int
    product_ids: list[int]
    purpose: str
    additional_instructions: Optional[str] = None
    reference_newsletter_ids: list[int] = []


class GenerateResponse(BaseModel):
    id: int
    client_id: int
    subject: Optional[str] = None
    html_ec: Optional[str] = None
    html_rakuten: Optional[str] = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class GeneratedNewsletterRead(BaseModel):
    id: int
    client_id: int
    subject: Optional[str] = None
    html_ec: Optional[str] = None
    html_rakuten: Optional[str] = None
    prompt_used: Optional[str] = None
    generation_params: Optional[dict[str, Any]] = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class GeneratedNewsletterUpdate(BaseModel):
    subject: Optional[str] = None
    html_ec: Optional[str] = None
    html_rakuten: Optional[str] = None
    status: Optional[str] = None


class RegenerateSlotRequest(BaseModel):
    slot_key: str
    instruction: str


class SuggestSubjectRequest(BaseModel):
    client_id: int
    purpose: str
    product_ids: list[int] = []


class SuggestSubjectResponse(BaseModel):
    subjects: list[str]
