from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.database import get_db
from app.models.contact import PartnerContact
from app.schemas.geo import GeoContactOut
from app.services import geo_service

router = APIRouter()


@router.get("/geo/all", response_model=list[GeoContactOut], summary="Get all contacts for map view")
async def get_all_geo_contacts(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[GeoContactOut]:
    """Return all contacts with geo-relevant fields for the map view."""
    result = await db.execute(select(PartnerContact))
    contacts = result.scalars().all()
    return [GeoContactOut.model_validate(c) for c in contacts]


@router.post("/{contact_id}/geocode", response_model=GeoContactOut, summary="Geocode a contact's address")
async def geocode_contact(
    contact_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> GeoContactOut:
    """
    Geocode the address of a contact via Nominatim and store lat/lng.
    Returns 404 if the contact does not exist.
    Returns 422 if geocoding yields no result.
    """
    result = await db.execute(
        select(PartnerContact).where(PartnerContact.id == contact_id)
    )
    contact = result.scalar_one_or_none()
    if contact is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")

    coords = await geo_service.geocode_address(contact.street, contact.zip_code, contact.city)
    if coords is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Geocoding failed: no result for this address",
        )

    contact.lat, contact.lng = coords
    await db.flush()
    return GeoContactOut.model_validate(contact)
