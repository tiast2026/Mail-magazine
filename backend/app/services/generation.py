import json
import logging
import re
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.client import Client, ClientMallSetting
from app.models.newsletter import GeneratedNewsletter, PastNewsletter
from app.models.product import Product
from app.models.template import Template, TemplateSlot
from app.schemas.newsletter import GenerateRequest, SuggestSubjectRequest
from app.services.claude_client import ClaudeClient
from app.services.mall_converter import MallConverter
from app.services.prompt_builder import build_generation_prompt
from app.services.slot_engine import fill_slots

logger = logging.getLogger(__name__)


def _parse_json_response(text: str) -> dict:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    json_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if json_match:
        try:
            return json.loads(json_match.group(1).strip())
        except json.JSONDecodeError:
            pass

    brace_match = re.search(r"\{[\s\S]*\}", text)
    if brace_match:
        try:
            return json.loads(brace_match.group(0))
        except json.JSONDecodeError:
            pass

    return {"subject": "Generated Newsletter", "slots": {"main_content": text}}


async def generate_newsletter(
    request: GenerateRequest, db: AsyncSession
) -> GeneratedNewsletter:
    client_result = await db.execute(select(Client).where(Client.id == request.client_id))
    client = client_result.scalar_one_or_none()
    if not client:
        raise ValueError(f"Client {request.client_id} not found")

    template_result = await db.execute(
        select(Template)
        .options(selectinload(Template.slots))
        .where(Template.id == request.template_id)
    )
    template = template_result.scalar_one_or_none()
    if not template:
        raise ValueError(f"Template {request.template_id} not found")

    products = []
    if request.product_ids:
        product_result = await db.execute(
            select(Product).where(Product.id.in_(request.product_ids))
        )
        products = list(product_result.scalars().all())

    reference_newsletters: Optional[list[PastNewsletter]] = None
    if request.reference_newsletter_ids:
        ref_result = await db.execute(
            select(PastNewsletter).where(
                PastNewsletter.id.in_(request.reference_newsletter_ids)
            )
        )
        reference_newsletters = list(ref_result.scalars().all())

    system_prompt, user_prompt = build_generation_prompt(
        client=client,
        template_slots=template.slots,
        products=products,
        purpose=request.purpose,
        additional_instructions=request.additional_instructions,
        reference_newsletters=reference_newsletters,
    )

    claude = ClaudeClient()
    raw_response = await claude.generate(system_prompt, user_prompt)
    parsed = _parse_json_response(raw_response)

    subject = parsed.get("subject", "Generated Newsletter")
    slot_values = parsed.get("slots", {})

    for slot in template.slots:
        if slot.slot_type == "fixed":
            if slot.fixed_content_ec:
                slot_values[slot.slot_key] = slot.fixed_content_ec

    product_mall_urls_ec: dict[int, str] = {}
    product_mall_urls_rakuten: dict[int, str] = {}
    for product in products:
        if product.mall_urls:
            product_mall_urls_ec[product.id] = product.mall_urls.get("ec", "")
            product_mall_urls_rakuten[product.id] = product.mall_urls.get("rakuten", "")

    html_ec = fill_slots(
        template_html=template.base_html,
        slot_values=slot_values,
        products=products,
        mall_type="ec",
        product_mall_urls=product_mall_urls_ec,
    )
    html_ec = MallConverter.convert(html_ec, "ec")

    rakuten_slot_values = dict(slot_values)
    for slot in template.slots:
        if slot.slot_type == "fixed" and slot.fixed_content_rakuten:
            rakuten_slot_values[slot.slot_key] = slot.fixed_content_rakuten

    html_rakuten = fill_slots(
        template_html=template.base_html,
        slot_values=rakuten_slot_values,
        products=products,
        mall_type="rakuten",
        product_mall_urls=product_mall_urls_rakuten,
    )

    mall_settings_dict = None
    mall_setting_result = await db.execute(
        select(ClientMallSetting).where(
            ClientMallSetting.client_id == client.id,
            ClientMallSetting.mall_type == "rakuten",
        )
    )
    rakuten_setting = mall_setting_result.scalar_one_or_none()
    if rakuten_setting:
        mall_settings_dict = {
            "image_base_url": rakuten_setting.image_base_url,
            "base_url": rakuten_setting.base_url,
        }
    html_rakuten = MallConverter.convert(html_rakuten, "rakuten", mall_settings_dict)

    if rakuten_setting and rakuten_setting.footer_html:
        html_rakuten += rakuten_setting.footer_html

    newsletter = GeneratedNewsletter(
        client_id=request.client_id,
        subject=subject,
        html_ec=html_ec,
        html_rakuten=html_rakuten,
        prompt_used=user_prompt,
        generation_params={
            "template_id": request.template_id,
            "product_ids": request.product_ids,
            "purpose": request.purpose,
            "additional_instructions": request.additional_instructions,
            "reference_newsletter_ids": request.reference_newsletter_ids,
        },
        status="draft",
    )
    db.add(newsletter)
    await db.flush()
    await db.refresh(newsletter)
    return newsletter


async def regenerate_slot(
    newsletter: GeneratedNewsletter,
    slot_key: str,
    instruction: str,
    db: AsyncSession,
) -> GeneratedNewsletter:
    params = newsletter.generation_params or {}
    template_id = params.get("template_id")

    template_result = await db.execute(
        select(Template)
        .options(selectinload(Template.slots))
        .where(Template.id == template_id)
    )
    template = template_result.scalar_one_or_none()

    client_result = await db.execute(
        select(Client).where(Client.id == newsletter.client_id)
    )
    client = client_result.scalar_one_or_none()

    products = []
    product_ids = params.get("product_ids", [])
    if product_ids:
        product_result = await db.execute(
            select(Product).where(Product.id.in_(product_ids))
        )
        products = list(product_result.scalars().all())

    system_prompt = (
        "You are an expert EC newsletter copywriter. "
        "You write engaging, conversion-focused content in Japanese. "
        "Respond ONLY with the HTML content for the requested slot. No JSON wrapping."
    )

    user_prompt = (
        f"Regenerate the content for the slot '{slot_key}' in a newsletter.\n\n"
        f"Client: {client.name if client else 'Unknown'}\n"
        f"Instruction: {instruction}\n\n"
        f"Current newsletter subject: {newsletter.subject}\n\n"
        "Generate only the HTML content for this slot."
    )

    claude = ClaudeClient()
    new_content = await claude.generate(system_prompt, user_prompt)

    if template:
        slot_values = {slot_key: new_content}

        for slot in template.slots:
            if slot.slot_key != slot_key and slot.slot_type == "fixed" and slot.fixed_content_ec:
                slot_values[slot.slot_key] = slot.fixed_content_ec

        product_mall_urls_ec = {}
        for product in products:
            if product.mall_urls:
                product_mall_urls_ec[product.id] = product.mall_urls.get("ec", "")

        html_ec = fill_slots(
            template_html=template.base_html,
            slot_values=slot_values,
            products=products,
            mall_type="ec",
            product_mall_urls=product_mall_urls_ec,
        )
        newsletter.html_ec = MallConverter.convert(html_ec, "ec")

        rakuten_slot_values = dict(slot_values)
        for slot in template.slots:
            if slot.slot_key != slot_key and slot.slot_type == "fixed" and slot.fixed_content_rakuten:
                rakuten_slot_values[slot.slot_key] = slot.fixed_content_rakuten

        product_mall_urls_rakuten = {}
        for product in products:
            if product.mall_urls:
                product_mall_urls_rakuten[product.id] = product.mall_urls.get("rakuten", "")

        html_rakuten = fill_slots(
            template_html=template.base_html,
            slot_values=rakuten_slot_values,
            products=products,
            mall_type="rakuten",
            product_mall_urls=product_mall_urls_rakuten,
        )
        newsletter.html_rakuten = MallConverter.convert(html_rakuten, "rakuten")

    await db.flush()
    await db.refresh(newsletter)
    return newsletter


async def suggest_subjects(
    request: SuggestSubjectRequest, db: AsyncSession
) -> list[str]:
    client_result = await db.execute(
        select(Client).where(Client.id == request.client_id)
    )
    client = client_result.scalar_one_or_none()
    if not client:
        raise ValueError(f"Client {request.client_id} not found")

    products = []
    if request.product_ids:
        product_result = await db.execute(
            select(Product).where(Product.id.in_(request.product_ids))
        )
        products = list(product_result.scalars().all())

    system_prompt = (
        "You are an expert EC newsletter copywriter. "
        "Generate compelling email subject lines in Japanese. "
        "Respond ONLY with a JSON array of 5 subject line strings."
    )

    product_info = ""
    if products:
        product_names = [p.product_name for p in products]
        product_info = f"\nFeatured products: {', '.join(product_names)}"

    user_prompt = (
        f"Generate 5 email subject line suggestions for a newsletter.\n\n"
        f"Client: {client.name}\n"
        f"Industry: {client.industry or 'General'}\n"
        f"Purpose: {request.purpose}\n"
        f"{product_info}\n\n"
        "Respond with a JSON array of 5 subject lines in Japanese. Example:\n"
        '["Subject 1", "Subject 2", "Subject 3", "Subject 4", "Subject 5"]'
    )

    claude = ClaudeClient()
    raw_response = await claude.generate(system_prompt, user_prompt, max_tokens=1024)

    try:
        subjects = json.loads(raw_response)
        if isinstance(subjects, list):
            return [str(s) for s in subjects[:5]]
    except json.JSONDecodeError:
        pass

    json_match = re.search(r"\[[\s\S]*?\]", raw_response)
    if json_match:
        try:
            subjects = json.loads(json_match.group(0))
            if isinstance(subjects, list):
                return [str(s) for s in subjects[:5]]
        except json.JSONDecodeError:
            pass

    lines = [line.strip().strip("-").strip("*").strip() for line in raw_response.strip().split("\n") if line.strip()]
    return lines[:5] if lines else ["Newsletter Subject"]
