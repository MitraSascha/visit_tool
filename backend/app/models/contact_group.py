from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ContactGroup(Base):
    __tablename__ = "contact_groups"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class ContactGroupMember(Base):
    __tablename__ = "contact_group_members"
    __table_args__ = (UniqueConstraint("group_id", "contact_id"),)
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("contact_groups.id", ondelete="CASCADE"))
    contact_id: Mapped[int] = mapped_column(ForeignKey("partner_contact.id", ondelete="CASCADE"))
