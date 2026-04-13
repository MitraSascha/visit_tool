import jellyfish
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_db
from app.models.contact import PartnerContact
from app.schemas.contact import ContactOut
from app.schemas.duplicate import DuplicateContactOut

router = APIRouter()


@router.get("/contacts/{contact_id}/duplicates", response_model=list[DuplicateContactOut])
async def find_duplicates(
    contact_id: int,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    # Eigenen Kontakt laden
    result = await db.execute(select(PartnerContact).where(PartnerContact.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Kontakt nicht gefunden")

    # Alle anderen Kontakte laden
    result = await db.execute(select(PartnerContact).where(PartnerContact.id != contact_id))
    others = result.scalars().all()

    duplicates = []
    name_a = (contact.company_name or "").lower()

    for other in others:
        name_b = (other.company_name or "").lower()
        if not name_b:
            continue
        score = jellyfish.jaro_winkler_similarity(name_a, name_b)
        if score > 0.85:
            out = ContactOut.model_validate(other)
            dup = DuplicateContactOut(**out.model_dump(), similarity_score=round(score, 3))
            duplicates.append(dup)

    duplicates.sort(key=lambda x: x.similarity_score, reverse=True)
    return duplicates
