from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.database import get_db
from app.models.activity_log import ActivityLog
from app.schemas.activity_log import ActivityLogOut

router = APIRouter()


@router.get("/activity-logs", response_model=list[ActivityLogOut])
async def get_activity_logs(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = 50,
) -> list[ActivityLogOut]:
    if not current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Nur für Admins")
    result = await db.execute(
        select(ActivityLog).order_by(ActivityLog.created_at.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()
