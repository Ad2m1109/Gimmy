from typing import Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel, field_validator

from app.api import deps
from app.models.user import User
from app.models.feedback import Feedback

router = APIRouter()


class FeedbackCreate(BaseModel):
    type: str
    title: str
    description: str

    @field_validator("type")
    @classmethod
    def validate_type(cls, v):
        allowed = {"bug", "feature", "general"}
        if v not in allowed:
            raise ValueError(f"type must be one of {allowed}")
        return v


class FeedbackRead(BaseModel):
    id: int
    type: str
    title: str
    description: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=FeedbackRead, status_code=201)
async def submit_feedback(
    payload: FeedbackCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: Optional[User] = Depends(deps.get_optional_user),
) -> Any:
    """Submit feedback. Auth is optional — anonymous submissions are allowed."""
    fb = Feedback(
        user_id=current_user.id if current_user else None,
        type=payload.type,
        title=payload.title,
        description=payload.description,
    )
    db.add(fb)
    await db.commit()
    await db.refresh(fb)
    return fb


@router.get("/me", response_model=List[FeedbackRead])
async def get_my_feedback(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get the current user's submitted feedback."""
    result = await db.execute(
        select(Feedback)
        .where(Feedback.user_id == current_user.id)
        .order_by(desc(Feedback.created_at))
    )
    return result.scalars().all()
