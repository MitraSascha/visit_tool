import enum
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class HasWorkedWithUsEnum(str, enum.Enum):
    yes = "yes"
    no = "no"
    not_yet = "not_yet"


class ResponseSpeedEnum(str, enum.Enum):
    very_fast = "very_fast"
    fast = "fast"
    medium = "medium"
    slow = "slow"


class PriorityEnum(str, enum.Enum):
    high = "high"
    medium = "medium"
    low = "low"


class AssetTypeEnum(str, enum.Enum):
    front = "front"
    back = "back"
    document = "document"


class PartnerContact(Base):
    __tablename__ = "partner_contact"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Stammdaten
    company_name: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    contact_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    job_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    mobile: Mapped[str | None] = mapped_column(String(50), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Adresse
    street: Mapped[str | None] = mapped_column(String(255), nullable=True)
    zip_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)

    # Einordnung
    category: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    trade: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    service_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    service_area: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)

    # Praxisnutzen / interne Felder
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommended_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    has_worked_with_us: Mapped[HasWorkedWithUsEnum | None] = mapped_column(
        Enum(HasWorkedWithUsEnum, name="has_worked_with_us_enum"), nullable=True
    )
    internal_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_project: Mapped[str | None] = mapped_column(String(255), nullable=True)
    response_speed: Mapped[ResponseSpeedEnum | None] = mapped_column(
        Enum(ResponseSpeedEnum, name="response_speed_enum"), nullable=True
    )
    priority: Mapped[PriorityEnum | None] = mapped_column(
        Enum(PriorityEnum, name="priority_enum"), nullable=True
    )
    known_by: Mapped[str | None] = mapped_column(String(255), nullable=True)

    last_contacted_at: Mapped[datetime | None] = mapped_column(nullable=True)
    lat: Mapped[float | None] = mapped_column(nullable=True)
    lng: Mapped[float | None] = mapped_column(nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    assets: Mapped[list["PartnerCardAsset"]] = relationship(
        "PartnerCardAsset", back_populates="contact", cascade="all, delete-orphan"
    )


class PartnerCardAsset(Base):
    __tablename__ = "partner_card_asset"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    partner_contact_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("partner_contact.id", ondelete="CASCADE"), nullable=False, index=True
    )
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    type: Mapped[AssetTypeEnum] = mapped_column(
        Enum(AssetTypeEnum, name="asset_type_enum"), nullable=False, default=AssetTypeEnum.document
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    contact: Mapped["PartnerContact"] = relationship("PartnerContact", back_populates="assets")
