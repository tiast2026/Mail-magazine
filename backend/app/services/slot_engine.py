import re
from typing import Optional

from app.models.product import Product


def fill_slots(
    template_html: str,
    slot_values: dict[str, str],
    products: list[Product],
    mall_type: str,
    product_mall_urls: Optional[dict[int, str]] = None,
) -> str:
    html = template_html

    for key, value in slot_values.items():
        placeholder = "{{" + key + "}}"
        html = html.replace(placeholder, value)

    html = _process_product_loops(html, products, mall_type, product_mall_urls)

    return html


def _process_product_loops(
    html: str,
    products: list[Product],
    mall_type: str,
    product_mall_urls: Optional[dict[int, str]] = None,
) -> str:
    pattern = r"\{\{#each\s+PRODUCTS\}\}(.*?)\{\{/each\}\}"
    matches = re.findall(pattern, html, re.DOTALL)

    if not matches:
        return html

    for match in matches:
        product_blocks = []
        for product in products:
            block = match

            product_url = ""
            if product_mall_urls and product.id in product_mall_urls:
                product_url = product_mall_urls[product.id]
            elif product.mall_urls:
                if mall_type in product.mall_urls:
                    product_url = product.mall_urls[mall_type]
                elif product.mall_urls:
                    product_url = next(iter(product.mall_urls.values()), "")

            block = block.replace("{{product.url}}", product_url)
            block = block.replace("{{product.name}}", product.product_name or "")

            price_str = f"{product.price:,}" if product.price is not None else ""
            block = block.replace("{{product.price}}", price_str)

            image_url = ""
            if product.image_urls and len(product.image_urls) > 0:
                image_url = product.image_urls[0] if isinstance(product.image_urls, list) else ""
            block = block.replace("{{product.image}}", image_url)

            block = block.replace("{{product.description}}", product.description or "")

            catch_copy = ""
            if product.description:
                catch_copy = product.description[:50]
            block = block.replace("{{product.catch_copy}}", catch_copy)

            product_blocks.append(block)

        full_pattern = "{{#each PRODUCTS}}" + match + "{{/each}}"
        html = html.replace(full_pattern, "\n".join(product_blocks))

    return html
