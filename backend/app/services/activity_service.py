from sqlalchemy.ext.asyncio import AsyncSession
from app.models.activity_log import ActivityLog


async def log_activity(
    db: AsyncSession,
    user_id: int | None,
    action: str,
    entity_type: str,
    entity_id: int | None = None,
    detail: str | None = None
) -> None:
    entry = ActivityLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        detail=detail
    )
    db.add(entry)
    # Kein commit hier — wird vom aufrufenden Endpoint committed
