from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.database import get_db
from app.models.project import Project, ProjectContact
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectOut, ProjectContactCreate, ProjectContactOut

router = APIRouter()


@router.get("/projects", response_model=list[ProjectOut])
async def list_projects(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[ProjectOut]:
    result = await db.execute(select(Project).order_by(Project.created_at.desc()))
    return result.scalars().all()


@router.post("/projects", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProjectOut:
    project = Project(**body.model_dump())
    db.add(project)
    await db.flush()
    await db.refresh(project)
    return ProjectOut.model_validate(project)


@router.get("/projects/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProjectOut:
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return ProjectOut.model_validate(project)


@router.put("/projects/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: int,
    body: ProjectUpdate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProjectOut:
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    await db.flush()
    await db.refresh(project)
    return ProjectOut.model_validate(project)


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    await db.delete(project)


@router.post("/projects/{project_id}/contacts", response_model=ProjectContactOut, status_code=status.HTTP_201_CREATED)
async def add_project_contact(
    project_id: int,
    body: ProjectContactCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProjectContactOut:
    # Verify project exists
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    pc = ProjectContact(project_id=project_id, contact_id=body.contact_id, role=body.role)
    db.add(pc)
    await db.flush()
    await db.refresh(pc)
    return ProjectContactOut.model_validate(pc)


@router.delete("/projects/{project_id}/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_project_contact(
    project_id: int,
    contact_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    result = await db.execute(
        select(ProjectContact)
        .where(ProjectContact.project_id == project_id, ProjectContact.contact_id == contact_id)
    )
    pc = result.scalar_one_or_none()
    if pc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project contact link not found")
    await db.delete(pc)


@router.get("/contacts/{contact_id}/projects", response_model=list[ProjectOut])
async def get_projects_for_contact(
    contact_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[ProjectOut]:
    result = await db.execute(
        select(Project)
        .join(ProjectContact, ProjectContact.project_id == Project.id)
        .where(ProjectContact.contact_id == contact_id)
        .order_by(Project.created_at.desc())
    )
    return result.scalars().all()
