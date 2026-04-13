from datetime import datetime
from sqlalchemy import Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id:         Mapped[int]      = mapped_column(primary_key=True, autoincrement=True)
    user_id:    Mapped[int]      = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    endpoint:   Mapped[str]      = mapped_column(Text, unique=True)
    p256dh:     Mapped[str]      = mapped_column(Text)
    auth:       Mapped[str]      = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
