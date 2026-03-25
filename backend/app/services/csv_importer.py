import csv
import io
import logging
from typing import Optional

import chardet
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.schemas.product import ProductImportResult

logger = logging.getLogger(__name__)

COLUMN_MAPPING = {
    "product_name": ["product_name", "name", "商品名", "商品名称"],
    "description": ["description", "desc", "説明", "商品説明"],
    "price": ["price", "価格", "税込価格", "販売価格"],
    "category": ["category", "カテゴリ", "カテゴリー"],
    "image_url": ["image_url", "image", "画像URL", "画像"],
    "ec_url": ["ec_url", "ec_link", "ECサイトURL", "自社サイトURL"],
    "rakuten_url": ["rakuten_url", "rakuten_link", "楽天URL", "楽天市場URL"],
}


def _find_column(headers: list[str], candidates: list[str]) -> Optional[str]:
    normalized_headers = {h.strip().lower(): h for h in headers}
    for candidate in candidates:
        if candidate.lower() in normalized_headers:
            return normalized_headers[candidate.lower()]
    return None


async def import_csv(file_content: bytes, client_id: int, db: AsyncSession) -> ProductImportResult:
    detected = chardet.detect(file_content)
    encoding = detected.get("encoding", "utf-8") or "utf-8"

    try:
        text = file_content.decode(encoding)
    except (UnicodeDecodeError, LookupError):
        try:
            text = file_content.decode("utf-8")
        except UnicodeDecodeError:
            text = file_content.decode("shift_jis")

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        return ProductImportResult(success_count=0, error_count=1, errors=["CSV file has no headers"])

    headers = list(reader.fieldnames)
    col_product_name = _find_column(headers, COLUMN_MAPPING["product_name"])
    col_description = _find_column(headers, COLUMN_MAPPING["description"])
    col_price = _find_column(headers, COLUMN_MAPPING["price"])
    col_category = _find_column(headers, COLUMN_MAPPING["category"])
    col_image_url = _find_column(headers, COLUMN_MAPPING["image_url"])
    col_ec_url = _find_column(headers, COLUMN_MAPPING["ec_url"])
    col_rakuten_url = _find_column(headers, COLUMN_MAPPING["rakuten_url"])

    if not col_product_name:
        return ProductImportResult(
            success_count=0,
            error_count=1,
            errors=["Required column 'product_name' not found. Accepted headers: " + ", ".join(COLUMN_MAPPING["product_name"])],
        )

    success_count = 0
    error_count = 0
    errors: list[str] = []

    for row_num, row in enumerate(reader, start=2):
        try:
            product_name = (row.get(col_product_name) or "").strip()
            if not product_name:
                error_count += 1
                errors.append(f"Row {row_num}: product_name is empty")
                continue

            description = (row.get(col_description) or "").strip() if col_description else None
            category = (row.get(col_category) or "").strip() if col_category else None

            price = None
            if col_price:
                price_str = (row.get(col_price) or "").strip().replace(",", "").replace("¥", "").replace("円", "")
                if price_str:
                    try:
                        price = int(float(price_str))
                    except ValueError:
                        errors.append(f"Row {row_num}: invalid price '{row.get(col_price)}'")

            image_urls = []
            if col_image_url:
                img = (row.get(col_image_url) or "").strip()
                if img:
                    image_urls = [url.strip() for url in img.split("|") if url.strip()]

            mall_urls: dict[str, str] = {}
            if col_ec_url:
                ec = (row.get(col_ec_url) or "").strip()
                if ec:
                    mall_urls["ec"] = ec
            if col_rakuten_url:
                rakuten = (row.get(col_rakuten_url) or "").strip()
                if rakuten:
                    mall_urls["rakuten"] = rakuten

            if not mall_urls:
                mall_urls = {}

            product = Product(
                client_id=client_id,
                product_name=product_name,
                description=description or None,
                price=price,
                category=category or None,
                image_urls=image_urls if image_urls else None,
                mall_urls=mall_urls,
            )
            db.add(product)
            success_count += 1

        except Exception as e:
            error_count += 1
            errors.append(f"Row {row_num}: {str(e)}")

    if success_count > 0:
        await db.flush()

    return ProductImportResult(
        success_count=success_count,
        error_count=error_count,
        errors=errors,
    )
