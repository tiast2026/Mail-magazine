import re
from typing import Optional

from bs4 import BeautifulSoup
import cssutils
import logging

cssutils.log.setLevel(logging.CRITICAL)


class MallConverter:
    @staticmethod
    def convert(html: str, mall_type: str, mall_settings: Optional[dict] = None) -> str:
        if mall_type == "ec":
            return EcConverter.convert(html)
        elif mall_type == "rakuten":
            return RakutenConverter.convert(html, mall_settings)
        return html


class EcConverter:
    @staticmethod
    def convert(html: str) -> str:
        return _inline_css(html)


class RakutenConverter:
    ALLOWED_TAGS = [
        "a", "b", "br", "center", "div", "font", "h1", "h2", "h3", "h4",
        "hr", "i", "img", "li", "ol", "p", "span", "strong", "table",
        "tbody", "td", "th", "thead", "tr", "u", "ul",
    ]

    @staticmethod
    def convert(html: str, mall_settings: Optional[dict] = None) -> str:
        html = _inline_css(html)
        html = RakutenConverter._remove_disallowed_tags(html)
        if mall_settings and mall_settings.get("image_base_url"):
            html = RakutenConverter._convert_image_urls(html, mall_settings["image_base_url"])
        return html

    @staticmethod
    def _remove_disallowed_tags(html: str) -> str:
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup.find_all(True):
            if tag.name not in RakutenConverter.ALLOWED_TAGS:
                tag.unwrap()
        return str(soup)

    @staticmethod
    def _convert_image_urls(html: str, image_base_url: str) -> str:
        soup = BeautifulSoup(html, "html.parser")
        for img in soup.find_all("img"):
            src = img.get("src", "")
            if src and not src.startswith(("http://", "https://", "//")):
                img["src"] = image_base_url.rstrip("/") + "/" + src.lstrip("/")
        return str(soup)


def _inline_css(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    style_tags = soup.find_all("style")

    style_rules: dict[str, dict[str, str]] = {}
    for style_tag in style_tags:
        css_text = style_tag.string or ""
        try:
            sheet = cssutils.parseString(css_text)
            for rule in sheet:
                if rule.type == rule.STYLE_RULE:
                    selector = rule.selectorText
                    properties = {}
                    for prop in rule.style:
                        properties[prop.name] = prop.value
                    style_rules[selector] = properties
        except Exception:
            continue

    for selector, properties in style_rules.items():
        try:
            elements = soup.select(selector)
            for element in elements:
                existing_style = element.get("style", "")
                new_styles = "; ".join(f"{k}: {v}" for k, v in properties.items())
                if existing_style:
                    combined = existing_style.rstrip(";") + "; " + new_styles
                else:
                    combined = new_styles
                element["style"] = combined
        except Exception:
            continue

    for style_tag in style_tags:
        style_tag.decompose()

    return str(soup)
