import os
import shutil
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.config import settings
from app.database import get_db
from app.models.contact import AssetTypeEnum, PartnerCardAsset, PartnerContact
from app.schemas.contact import AssetOut

router = APIRouter()

_ALLOWED_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
}

_MAX_FILE_SIZE_MB = 20
_MAX_FILE_SIZE_BYTES = _MAX_FILE_SIZE_MB * 1024 * 1024


async def _get_contact_or_404(contact_id: int, db: AsyncSession) -> PartnerContact:
    result = await db.execute(
        select(PartnerContact).where(PartnerContact.id == contact_id)
    )
    contact = result.scalar_one_or_none()
    if contact is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    return contact


@router.post(
    "/contacts/{contact_id}/assets",
    response_model=AssetOut,
    status_code=status.HTTP_201_CREATED,
    summary="Upload an asset for a contact",
)
async def upload_asset(
    contact_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
    asset_type: AssetTypeEnum = Form(AssetTypeEnum.document),
) -> AssetOut:
    """
    Upload a file (image or PDF) and attach it to the given contact.
    Supported types: front, back, document.
    """
    await _get_contact_or_404(contact_id, db)

    # Validate content type
    content_type = file.content_type or ""
    if content_type not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type '{content_type}'. Allowed: {list(_ALLOWED_EXTENSIONS.keys())}",
        )

    # Read and check size
    file_bytes = await file.read()
    if len(file_bytes) > _MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {_MAX_FILE_SIZE_MB} MB.",
        )

    # Build target path
    ext = _ALLOWED_EXTENSIONS[content_type]
    filename = f"{uuid.uuid4().hex}{ext}"
    contact_dir = os.path.join(settings.upload_dir, str(contact_id))
    os.makedirs(contact_dir, exist_ok=True)
    file_path = os.path.join(contact_dir, filename)

    # Write file
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    # Relative path stored in DB (served via /uploads/...)
    relative_path = f"{contact_id}/{filename}"

    asset = PartnerCardAsset(
        partner_contact_id=contact_id,
        file_path=relative_path,
        type=asset_type,
    )
    db.add(asset)
    await db.flush()
    await db.refresh(asset)

    return AssetOut.model_validate(asset)


@router.get(
    "/contacts/{contact_id}/assets",
    response_model=list[AssetOut],
    summary="List assets for a contact",
)
async def list_assets(
    contact_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[AssetOut]:
    """Return all assets belonging to the given contact."""
    await _get_contact_or_404(contact_id, db)

    result = await db.execute(
        select(PartnerCardAsset)
        .where(PartnerCardAsset.partner_contact_id == contact_id)
        .order_by(PartnerCardAsset.created_at)
    )
    assets = result.scalars().all()
    return [AssetOut.model_validate(a) for a in assets]


@router.delete(
    "/assets/{asset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an asset",
)
async def delete_asset(
    asset_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Delete an asset record and remove the associated file from disk."""
    result = await db.execute(
        select(PartnerCardAsset).where(PartnerCardAsset.id == asset_id)
    )
    asset = result.scalar_one_or_none()
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    # Path-Traversal-Schutz: file_path darf nicht aus upload_dir herauszeigen
    upload_root = Path(settings.upload_dir).resolve()
    full_path = (upload_root / asset.file_path).resolve()
    if not full_path.is_relative_to(upload_root):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file path.")

    if full_path.is_file():
        full_path.unlink()

    # Leeres Kontakt-Verzeichnis aufräumen
    contact_dir = full_path.parent
    try:
        if contact_dir.is_dir() and not any(contact_dir.iterdir()):
            shutil.rmtree(contact_dir, ignore_errors=True)
    except OSError:
        pass

    await db.delete(asset)
