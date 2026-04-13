from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.database import get_db
from app.models.contact_group import ContactGroup, ContactGroupMember
from app.schemas.contact_group import ContactGroupCreate, ContactGroupOut, GroupMemberAdd

router = APIRouter()


@router.get("/groups", response_model=list[ContactGroupOut])
async def list_groups(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[ContactGroupOut]:
    result = await db.execute(select(ContactGroup).order_by(ContactGroup.name))
    return result.scalars().all()


@router.post("/groups", response_model=ContactGroupOut, status_code=status.HTTP_201_CREATED)
async def create_group(
    body: ContactGroupCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ContactGroupOut:
    group = ContactGroup(**body.model_dump())
    db.add(group)
    await db.flush()
    await db.refresh(group)
    return ContactGroupOut.model_validate(group)


@router.get("/groups/{group_id}", response_model=ContactGroupOut)
async def get_group(
    group_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ContactGroupOut:
    result = await db.execute(select(ContactGroup).where(ContactGroup.id == group_id))
    group = result.scalar_one_or_none()
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    return ContactGroupOut.model_validate(group)


@router.put("/groups/{group_id}", response_model=ContactGroupOut)
async def update_group(
    group_id: int,
    body: ContactGroupCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ContactGroupOut:
    result = await db.execute(select(ContactGroup).where(ContactGroup.id == group_id))
    group = result.scalar_one_or_none()
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(group, field, value)
    await db.flush()
    await db.refresh(group)
    return ContactGroupOut.model_validate(group)


@router.delete("/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    group_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    result = await db.execute(select(ContactGroup).where(ContactGroup.id == group_id))
    group = result.scalar_one_or_none()
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    await db.delete(group)


@router.post("/groups/{group_id}/members", response_model=ContactGroupOut, status_code=status.HTTP_201_CREATED)
async def add_group_member(
    group_id: int,
    body: GroupMemberAdd,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ContactGroupOut:
    # Verify group exists
    result = await db.execute(select(ContactGroup).where(ContactGroup.id == group_id))
    group = result.scalar_one_or_none()
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    member = ContactGroupMember(group_id=group_id, contact_id=body.contact_id)
    db.add(member)
    await db.flush()
    return ContactGroupOut.model_validate(group)


@router.delete("/groups/{group_id}/members/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_group_member(
    group_id: int,
    contact_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    result = await db.execute(
        select(ContactGroupMember)
        .where(ContactGroupMember.group_id == group_id, ContactGroupMember.contact_id == contact_id)
    )
    member = result.scalar_one_or_none()
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found in group")
    await db.delete(member)


@router.get("/contacts/{contact_id}/groups", response_model=list[ContactGroupOut])
async def get_groups_for_contact(
    contact_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[ContactGroupOut]:
    result = await db.execute(
        select(ContactGroup)
        .join(ContactGroupMember, ContactGroupMember.group_id == ContactGroup.id)
        .where(ContactGroupMember.contact_id == contact_id)
        .order_by(ContactGroup.name)
    )
    return result.scalars().all()
