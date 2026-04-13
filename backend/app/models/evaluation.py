from datetime import datetime
from sqlalchemy import Integer, Text, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Evaluation(Base):
    __tablename__ = "evaluations"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    contact_id: Mapped[int] = mapped_column(ForeignKey("partner_contact.id", ondelete="CASCADE"))
    quality: Mapped[int] = mapped_column(Integer)         # 1-5
    punctuality: Mapped[int] = mapped_column(Integer)     # 1-5
    communication: Mapped[int] = mapped_column(Integer)   # 1-5
    price_perf: Mapped[int] = mapped_column(Integer)      # 1-5 (Preis-Leistung)
    reliability: Mapped[int] = mapped_column(Integer)     # 1-5 (Zuverlässigkeit)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
