from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class ProductCreate(BaseModel):
    client_id: int
    product_name: str
    description: Optional[str] = None
    price: Optional[int] = None
    category: Optional[str] = None
    image_urls: Optional[list[str]] = None
    mall_urls: dict[str, str]


class ProductUpdate(BaseModel):
    product_name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[int] = None
    category: Optional[str] = None
    image_urls: Optional[list[str]] = None
    mall_urls: Optional[dict[str, str]] = None


class ProductRead(BaseModel):
    id: int
    client_id: int
    product_name: str
    description: Optional[str] = None
    price: Optional[int] = None
    category: Optional[str] = None
    image_urls: Optional[list[Any]] = None
    mall_urls: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProductImportResult(BaseModel):
    success_count: int
    error_count: int
    errors: list[str]
