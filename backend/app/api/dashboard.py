from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.database import get_db
from app.models.contact import PartnerContact
from app.models.reminder import Reminder
from app.schemas.dashboard import CategoryCount, DashboardStats

router = APIRouter()


@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DashboardStats:
    # Total contacts
    total = await db.scalar(select(func.count()).select_from(PartnerContact))

    # Avg rating (nur wo not null)
    avg_rating = await db.scalar(
        select(func.avg(PartnerContact.internal_rating))
        .where(PartnerContact.internal_rating.isnot(None))
    )

    # By category
    cat_result = await db.execute(
        select(PartnerContact.category, func.count().label("count"))
        .where(PartnerContact.category.isnot(None))
        .group_by(PartnerContact.category)
        .order_by(func.count().desc())
    )
    contacts_by_category = [CategoryCount(name=r[0], count=r[1]) for r in cat_result.all()]

    # By priority
    prio_result = await db.execute(
        select(PartnerContact.priority, func.count().label("count"))
        .where(PartnerContact.priority.isnot(None))
        .group_by(PartnerContact.priority)
    )
    contacts_by_priority = [CategoryCount(name=r[0].value if r[0] else "unbekannt", count=r[1]) for r in prio_result.all()]

    # Recently added (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recently_added = await db.scalar(
        select(func.count()).select_from(PartnerContact)
        .where(PartnerContact.created_at >= thirty_days_ago)
    )

    # Overdue reminders (due_date < now, is_done = False)
    overdue = await db.scalar(
        select(func.count()).select_from(Reminder)
        .where(and_(Reminder.due_date < datetime.utcnow(), Reminder.is_done == False))
    )

    # Without rating
    without_rating = await db.scalar(
        select(func.count()).select_from(PartnerContact)
        .where(PartnerContact.internal_rating.is_(None))
    )

    return DashboardStats(
        total_contacts=total or 0,
        avg_rating=round(float(avg_rating), 2) if avg_rating else None,
        contacts_by_category=contacts_by_category,
        contacts_by_priority=contacts_by_priority,
        recently_added=recently_added or 0,
        overdue_reminders_count=overdue or 0,
        contacts_without_rating=without_rating or 0,
    )
