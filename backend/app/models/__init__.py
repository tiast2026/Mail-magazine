from app.models.client import Client, ClientMallSetting
from app.models.newsletter import (
    CompetitorNewsletter,
    GeneratedNewsletter,
    PastNewsletter,
)
from app.models.product import Product
from app.models.template import Template, TemplateSlot

__all__ = [
    "Client",
    "ClientMallSetting",
    "Product",
    "Template",
    "TemplateSlot",
    "PastNewsletter",
    "CompetitorNewsletter",
    "GeneratedNewsletter",
]
