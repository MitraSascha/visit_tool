from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.database import get_db
from app.models.evaluation import Evaluation
from app.schemas.evaluation import EvaluationCreate, EvaluationOut

router = APIRouter()


def to_out(e: Evaluation) -> EvaluationOut:
    return EvaluationOut(
        id=e.id, contact_id=e.contact_id, quality=e.quality,
        punctuality=e.punctuality, communication=e.communication,
        price_perf=e.price_perf, reliability=e.reliability,
        note=e.note, created_at=e.created_at,
        average_score=round((e.quality + e.punctuality + e.communication + e.price_perf + e.reliability) / 5, 2)
    )


@router.post("/contacts/{contact_id}/evaluations", response_model=EvaluationOut, status_code=status.HTTP_201_CREATED)
async def create_evaluation(
    contact_id: int,
    body: EvaluationCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EvaluationOut:
    evaluation = Evaluation(contact_id=contact_id, **body.model_dump())
    db.add(evaluation)
    await db.flush()
    await db.refresh(evaluation)
    return to_out(evaluation)


@router.get("/contacts/{contact_id}/evaluations", response_model=list[EvaluationOut])
async def list_evaluations(
    contact_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[EvaluationOut]:
    result = await db.execute(
        select(Evaluation)
        .where(Evaluation.contact_id == contact_id)
        .order_by(Evaluation.created_at.desc())
    )
    evaluations = result.scalars().all()
    return [to_out(e) for e in evaluations]


@router.get("/evaluations/{evaluation_id}", response_model=EvaluationOut)
async def get_evaluation(
    evaluation_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EvaluationOut:
    result = await db.execute(select(Evaluation).where(Evaluation.id == evaluation_id))
    evaluation = result.scalar_one_or_none()
    if evaluation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation not found")
    return to_out(evaluation)
