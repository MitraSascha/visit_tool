from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class InteractionType(PyEnum):
    call = "call"
    meeting = "meeting"
    email = "email"
    note = "note"


class Interaction(Base):
    __tablename__ = "interactions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    contact_id: Mapped[int] = mapped_column(ForeignKey("partner_contact.id", ondelete="CASCADE"))
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    type: Mapped[InteractionType] = mapped_column(SAEnum(InteractionType, name="interaction_type_enum"))
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    contact: Mapped["PartnerContact"] = relationship("PartnerContact")  # noqa: F821
