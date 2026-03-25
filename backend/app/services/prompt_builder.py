from typing import Optional

from app.models.client import Client
from app.models.newsletter import PastNewsletter
from app.models.product import Product
from app.models.template import TemplateSlot


def build_generation_prompt(
    client: Client,
    template_slots: list[TemplateSlot],
    products: list[Product],
    purpose: str,
    additional_instructions: Optional[str] = None,
    reference_newsletters: Optional[list[PastNewsletter]] = None,
) -> tuple[str, str]:
    system_prompt = _build_system_prompt(client)
    user_prompt = _build_user_prompt(
        client, template_slots, products, purpose, additional_instructions, reference_newsletters
    )
    return system_prompt, user_prompt


def _build_system_prompt(client: Client) -> str:
    lines = [
        "You are an expert EC (e-commerce) newsletter copywriter.",
        "You write engaging, conversion-focused email newsletter content in Japanese.",
        "Your writing style should be appropriate for commercial email marketing.",
    ]
    if client.tone_description:
        lines.append(f"\nTone and style guidelines: {client.tone_description}")
    if client.industry:
        lines.append(f"Industry context: {client.industry}")
    lines.append(
        "\nYou must respond ONLY with valid JSON. Do not include any text outside the JSON object."
    )
    return "\n".join(lines)


def _build_user_prompt(
    client: Client,
    template_slots: list[TemplateSlot],
    products: list[Product],
    purpose: str,
    additional_instructions: Optional[str],
    reference_newsletters: Optional[list[PastNewsletter]],
) -> str:
    sections = []

    sections.append(f"## Client Information\n- Name: {client.name}")
    if client.industry:
        sections.append(f"- Industry: {client.industry}")

    sections.append(f"\n## Newsletter Purpose\n{purpose}")

    if products:
        sections.append("\n## Products to Feature")
        for i, product in enumerate(products, 1):
            product_info = f"\n### Product {i}: {product.product_name}"
            if product.description:
                product_info += f"\nDescription: {product.description}"
            if product.price is not None:
                product_info += f"\nPrice: {product.price:,} yen"
            if product.category:
                product_info += f"\nCategory: {product.category}"
            sections.append(product_info)

    if reference_newsletters:
        sections.append("\n## Reference Newsletters (use as style/structure reference)")
        for ref in reference_newsletters:
            ref_info = f"\n### Reference: {ref.subject or 'Untitled'}"
            if ref.html_content:
                content_preview = ref.html_content[:2000]
                ref_info += f"\nContent preview:\n{content_preview}"
            sections.append(ref_info)

    if additional_instructions:
        sections.append(f"\n## Additional Instructions\n{additional_instructions}")

    sections.append("\n## Slots to Fill")
    sections.append(
        "Generate content for each of the following slots. "
        "Return a JSON object with slot keys as keys and generated HTML content as values."
    )

    slot_descriptions = []
    for slot in sorted(template_slots, key=lambda s: s.sort_order):
        if slot.slot_type == "fixed":
            continue
        slot_desc = f'- "{slot.slot_key}" (type: {slot.slot_type})'
        if slot.default_prompt:
            slot_desc += f": {slot.default_prompt}"
        slot_descriptions.append(slot_desc)

    if slot_descriptions:
        sections.append("\n".join(slot_descriptions))
    else:
        sections.append('- "main_content": Generate the main newsletter body content')

    sections.append(
        '\n## Required Output Format\n'
        "Respond with a JSON object in the following format:\n"
        "```json\n"
        "{\n"
        '  "subject": "The email subject line",\n'
        '  "slots": {\n'
        '    "SLOT_KEY": "HTML content for this slot",\n'
        "    ...\n"
        "  }\n"
        "}\n"
        "```\n"
        "Generate all content in Japanese. Make the content engaging and suitable for email marketing."
    )

    return "\n".join(sections)
