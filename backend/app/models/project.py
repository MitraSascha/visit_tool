from datetime import datetime, date
from enum import Enum as PyEnum
from sqlalchemy import String, Text, Date, DateTime, ForeignKey, UniqueConstraint, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ProjectStatus(PyEnum):
    planned = "planned"
    active = "active"
    completed = "completed"


class Project(Base):
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[ProjectStatus] = mapped_column(SAEnum(ProjectStatus, name="project_status_enum"), default=ProjectStatus.planned)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class ProjectContact(Base):
    __tablename__ = "project_contacts"
    __table_args__ = (UniqueConstraint("project_id", "contact_id"),)
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    contact_id: Mapped[int] = mapped_column(ForeignKey("partner_contact.id", ondelete="CASCADE"))
    role: Mapped[str | None] = mapped_column(String(100), nullable=True)
