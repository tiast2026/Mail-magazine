from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.client import Base


class Template(Base):
    __tablename__ = "templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    client_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    base_html: Mapped[str] = mapped_column(Text, nullable=False)
    thumbnail: Mapped[str] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    slots = relationship(
        "TemplateSlot", back_populates="template", cascade="all, delete-orphan"
    )


class TemplateSlot(Base):
    __tablename__ = "template_slots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    template_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("templates.id", ondelete="CASCADE"), nullable=False
    )
    slot_key: Mapped[str] = mapped_column(String(100), nullable=False)
    slot_type: Mapped[str] = mapped_column(String(50), nullable=False)
    default_prompt: Mapped[str] = mapped_column(Text, nullable=True)
    fixed_content_ec: Mapped[str] = mapped_column(Text, nullable=True)
    fixed_content_rakuten: Mapped[str] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    template = relationship("Template", back_populates="slots")
