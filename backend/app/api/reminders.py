from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.database import get_db
from app.models.reminder import Reminder
from app.schemas.reminder import ReminderCreate, ReminderUpdate, ReminderOut

router = APIRouter()


@router.get("/reminders", response_model=list[ReminderOut])
async def list_reminders(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    overdue: bool = Query(False),
) -> list[ReminderOut]:
    stmt = select(Reminder)
    if overdue:
        stmt = stmt.where(
            and_(Reminder.due_date < datetime.utcnow(), Reminder.is_done == False)
        )
    stmt = stmt.order_by(Reminder.due_date.asc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/reminders", response_model=ReminderOut, status_code=status.HTTP_201_CREATED)
async def create_reminder(
    body: ReminderCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ReminderOut:
    reminder = Reminder(**body.model_dump())
    db.add(reminder)
    await db.flush()
    await db.refresh(reminder)
    return ReminderOut.model_validate(reminder)


@router.put("/reminders/{reminder_id}", response_model=ReminderOut)
async def update_reminder(
    reminder_id: int,
    body: ReminderUpdate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ReminderOut:
    result = await db.execute(select(Reminder).where(Reminder.id == reminder_id))
    reminder = result.scalar_one_or_none()
    if reminder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(reminder, field, value)
    await db.flush()
    await db.refresh(reminder)
    return ReminderOut.model_validate(reminder)


@router.delete("/reminders/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reminder(
    reminder_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    result = await db.execute(select(Reminder).where(Reminder.id == reminder_id))
    reminder = result.scalar_one_or_none()
    if reminder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")
    await db.delete(reminder)


@router.get("/contacts/{contact_id}/reminders", response_model=list[ReminderOut])
async def get_reminders_for_contact(
    contact_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[ReminderOut]:
    result = await db.execute(
        select(Reminder)
        .where(Reminder.contact_id == contact_id)
        .order_by(Reminder.due_date.asc())
    )
    return result.scalars().all()
