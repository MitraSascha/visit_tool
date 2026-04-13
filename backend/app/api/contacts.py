import math
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser
from app.database import get_db
from app.models.contact import HasWorkedWithUsEnum, PartnerContact, PriorityEnum
from app.schemas.contact import ContactCreate, ContactListOut, ContactOut, ContactUpdate

router = APIRouter()


def _apply_search_filter(stmt, q: str):
    """Apply ILIKE full-text search across key text fields."""
    pattern = f"%{q}%"
    return stmt.where(
        or_(
            PartnerContact.company_name.ilike(pattern),
            PartnerContact.contact_name.ilike(pattern),
            PartnerContact.service_description.ilike(pattern),
            PartnerContact.city.ilike(pattern),
            PartnerContact.trade.ilike(pattern),
            PartnerContact.category.ilike(pattern),
            PartnerContact.note.ilike(pattern),
            # PostgreSQL array-to-string cast for tags
            func.array_to_string(PartnerContact.tags, " ").ilike(pattern),
        )
    )


@router.get("", response_model=ContactListOut, summary="List contacts with filters")
async def list_contacts(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    q: str | None = Query(None, description="Full-text search"),
    category: str | None = Query(None),
    trade: str | None = Query(None),
    city: str | None = Query(None),
    has_worked_with_us: HasWorkedWithUsEnum | None = Query(None),
    min_rating: int | None = Query(None, ge=1, le=5),
    priority: PriorityEnum | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=1000),
) -> ContactListOut:
    """
    Return a paginated list of contacts.
    Supports full-text search and multiple filter parameters.
    """
    stmt = select(PartnerContact).options(selectinload(PartnerContact.assets))

    if q:
        stmt = _apply_search_filter(stmt, q)
    if category:
        stmt = stmt.where(PartnerContact.category.ilike(f"%{category}%"))
    if trade:
        stmt = stmt.where(PartnerContact.trade.ilike(f"%{trade}%"))
    if city:
        stmt = stmt.where(PartnerContact.city.ilike(f"%{city}%"))
    if has_worked_with_us is not None:
        stmt = stmt.where(PartnerContact.has_worked_with_us == has_worked_with_us)
    if min_rating is not None:
        stmt = stmt.where(PartnerContact.internal_rating >= min_rating)
    if priority is not None:
        stmt = stmt.where(PartnerContact.priority == priority)

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total: int = total_result.scalar_one()

    # Paginate
    offset = (page - 1) * page_size
    stmt = stmt.order_by(PartnerContact.company_name).offset(offset).limit(page_size)
    result = await db.execute(stmt)
    contacts = result.scalars().all()

    pages = math.ceil(total / page_size) if total > 0 else 1

    return ContactListOut(
        items=[ContactOut.model_validate(c) for c in contacts],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.post("", response_model=ContactOut, status_code=status.HTTP_201_CREATED, summary="Create contact")
async def create_contact(
    body: ContactCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ContactOut:
    """Create a new partner contact."""
    contact = PartnerContact(**body.model_dump(exclude_none=False))
    db.add(contact)
    await db.flush()
    await db.refresh(contact, ["assets"])
    return ContactOut.model_validate(contact)


@router.get("/{contact_id}", response_model=ContactOut, summary="Get single contact")
async def get_contact(
    contact_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ContactOut:
    """Return a single contact including its assets."""
    result = await db.execute(
        select(PartnerContact)
        .options(selectinload(PartnerContact.assets))
        .where(PartnerContact.id == contact_id)
    )
    contact = result.scalar_one_or_none()
    if contact is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    return ContactOut.model_validate(contact)


@router.put("/{contact_id}", response_model=ContactOut, summary="Update contact")
async def update_contact(
    contact_id: int,
    body: ContactUpdate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ContactOut:
    """Update an existing partner contact. Only provided fields are updated."""
    result = await db.execute(
        select(PartnerContact)
        .options(selectinload(PartnerContact.assets))
        .where(PartnerContact.id == contact_id)
    )
    contact = result.scalar_one_or_none()
    if contact is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(contact, field, value)

    await db.flush()
    await db.refresh(contact, ["assets"])
    return ContactOut.model_validate(contact)


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete contact")
async def delete_contact(
    contact_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Permanently delete a contact and all its assets."""
    result = await db.execute(
        select(PartnerContact).where(PartnerContact.id == contact_id)
    )
    contact = result.scalar_one_or_none()
    if contact is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")

    await db.delete(contact)
