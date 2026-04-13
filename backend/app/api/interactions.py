from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.database import get_db
from app.models.contact import PartnerContact
from app.models.interaction import Interaction
from app.schemas.interaction import InteractionCreate, InteractionOut

router = APIRouter()


@router.get("/contacts/{contact_id}/interactions", response_model=list[InteractionOut], summary="List interactions for a contact")
async def list_interactions(
    contact_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[InteractionOut]:
    """Return all interactions for a contact, sorted by date descending."""
    # Verify contact exists
    contact_result = await db.execute(
        select(PartnerContact).where(PartnerContact.id == contact_id)
    )
    contact = contact_result.scalar_one_or_none()
    if contact is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")

    result = await db.execute(
        select(Interaction)
        .where(Interaction.contact_id == contact_id)
        .order_by(desc(Interaction.date))
    )
    interactions = result.scalars().all()
    return [InteractionOut.model_validate(i) for i in interactions]


@router.post("/contacts/{contact_id}/interactions", response_model=InteractionOut, status_code=status.HTTP_201_CREATED, summary="Create interaction for a contact")
async def create_interaction(
    contact_id: int,
    body: InteractionCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> InteractionOut:
    """Create a new interaction and update last_contacted_at on the contact if applicable."""
    # Verify contact exists
    contact_result = await db.execute(
        select(PartnerContact).where(PartnerContact.id == contact_id)
    )
    contact = contact_result.scalar_one_or_none()
    if contact is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")

    interaction = Interaction(
        contact_id=contact_id,
        date=body.date,
        type=body.type,
        note=body.note,
    )
    db.add(interaction)

    # Update last_contacted_at if new date is more recent (or was not set)
    new_date = body.date
    if contact.last_contacted_at is None or new_date > contact.last_contacted_at:
        contact.last_contacted_at = new_date

    await db.flush()
    await db.refresh(interaction)
    return InteractionOut.model_validate(interaction)


@router.delete("/interactions/{interaction_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete an interaction")
async def delete_interaction(
    interaction_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Permanently delete an interaction."""
    result = await db.execute(
        select(Interaction).where(Interaction.id == interaction_id)
    )
    interaction = result.scalar_one_or_none()
    if interaction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interaction not found")

    await db.delete(interaction)
