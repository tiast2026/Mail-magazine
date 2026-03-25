from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductImportResult, ProductRead, ProductUpdate
from app.services.csv_importer import import_csv

router = APIRouter()


@router.get("/", response_model=list[ProductRead])
async def list_products(
    client_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Product)
    if client_id is not None:
        query = query.where(Product.client_id == client_id)
    if category is not None:
        query = query.where(Product.category == category)
    if search is not None:
        query = query.where(Product.product_name.ilike(f"%{search}%"))
    query = query.order_by(Product.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=ProductRead, status_code=201)
async def create_product(data: ProductCreate, db: AsyncSession = Depends(get_db)):
    product = Product(
        client_id=data.client_id,
        product_name=data.product_name,
        description=data.description,
        price=data.price,
        category=data.category,
        image_urls=data.image_urls,
        mall_urls=data.mall_urls,
    )
    db.add(product)
    await db.flush()
    await db.refresh(product)
    return product


@router.get("/{product_id}", response_model=ProductRead)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.put("/{product_id}", response_model=ProductRead)
async def update_product(
    product_id: int, data: ProductUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(product, key, value)
    await db.flush()
    await db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=204)
async def delete_product(product_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    await db.delete(product)
    await db.flush()


@router.post("/import-csv", response_model=ProductImportResult)
async def import_csv_endpoint(
    client_id: int = Query(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    result = await import_csv(content, client_id, db)
    return result
