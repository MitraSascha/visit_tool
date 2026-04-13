from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.database import get_db
from app.models.push_subscription import PushSubscription
from app.schemas.push_subscription import PushSubscriptionCreate, PushSubscriptionDelete
from app.services.push_service import get_vapid_keys

router = APIRouter()


@router.get("/push/vapid-key")
async def get_vapid_public_key() -> dict:
    """Gibt den öffentlichen VAPID-Key zurück (kein Auth erforderlich)."""
    _, public_key = get_vapid_keys()
    return {"public_key": public_key}


@router.post("/push/subscribe", status_code=status.HTTP_204_NO_CONTENT)
async def subscribe(
    body: PushSubscriptionCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Speichert eine Push-Subscription für den aktuellen Nutzer."""
    existing = await db.execute(
        select(PushSubscription).where(PushSubscription.endpoint == body.endpoint)
    )
    if existing.scalar_one_or_none():
        return  # bereits vorhanden

    db.add(PushSubscription(
        user_id  = current_user.id,
        endpoint = body.endpoint,
        p256dh   = body.keys.get("p256dh", ""),
        auth     = body.keys.get("auth", ""),
    ))
    await db.flush()


@router.delete("/push/unsubscribe", status_code=status.HTTP_204_NO_CONTENT)
async def unsubscribe(
    body: PushSubscriptionDelete,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Entfernt eine Push-Subscription."""
    result = await db.execute(
        select(PushSubscription).where(
            PushSubscription.endpoint == body.endpoint,
            PushSubscription.user_id  == current_user.id,
        )
    )
    sub = result.scalar_one_or_none()
    if sub:
        await db.delete(sub)
