from typing import Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.api import deps
from app.models.user import User

router = APIRouter()


@router.get("")
async def get_leaderboard(
    db: AsyncSession = Depends(deps.get_db),
    limit: int = 20,
) -> Any:
    """Return top users ranked by total XP. Public endpoint — no auth required."""
    result = await db.execute(
        select(User)
        .where(User.total_xp > 0)
        .order_by(desc(User.total_xp))
        .limit(limit)
    )
    users = result.scalars().all()

    return [
        {
            "rank": idx + 1,
            "username": u.username,
            "total_xp": u.total_xp or 0,
            "level": u.level or 1,
        }
        for idx, u in enumerate(users)
    ]
