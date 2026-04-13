from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.api.deps import CurrentUser
from app.schemas.ocr import OcrResult
from app.services.ocr_service import extract_text_from_base64, extract_text_from_image

router = APIRouter()

_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/tiff", "image/bmp"}


class OcrBase64Request(BaseModel):
    """Request body for base64-encoded image OCR."""
    image: str  # base64-encoded image, optionally with data-URI prefix


@router.post(
    "/extract",
    response_model=OcrResult,
    summary="Extract contact data from a business card image",
)
async def ocr_extract(
    current_user: CurrentUser,
    file: UploadFile | None = File(None),
    back: UploadFile | None = File(None),
) -> OcrResult:
    """
    Extract structured contact data from a business card image.

    Accepts multipart file upload(s): `file` = front side (required),
    `back` = back side (optional). When both are provided they are sent
    together to the vision model for better accuracy.
    """
    if file is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide an image file via multipart upload.",
        )

    for upload in (f for f in [file, back] if f is not None):
        ct = upload.content_type or ""
        if ct not in _ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported image type '{ct}'. Allowed: {sorted(_ALLOWED_IMAGE_TYPES)}",
            )

    front_bytes = await file.read()
    if not front_bytes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is empty.",
        )

    back_bytes = await back.read() if back is not None else None

    try:
        return extract_text_from_image(front_bytes, back_bytes)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR processing failed: {exc}",
        ) from exc


@router.post(
    "/extract-base64",
    response_model=OcrResult,
    summary="Extract contact data from a base64-encoded image",
)
async def ocr_extract_base64(
    body: OcrBase64Request,
    current_user: CurrentUser,
) -> OcrResult:
    """
    Extract structured contact data from a base64-encoded business card image.

    Accepts JSON body with `image` field (base64 string, data-URI prefix optional).
    """
    if not body.image:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The 'image' field must not be empty.",
        )

    try:
        return extract_text_from_base64(body.image)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR processing failed: {exc}",
        ) from exc
