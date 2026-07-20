from typing import Any, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.api import deps
from app.core import security
from app.models.user import User
from app.models.game import Game
from app.models.favorite import UserFavorite
from app.models.session import UserGameSession
from app.schemas.game import GameRead
from app.schemas.user import UserUpdate, PasswordUpdate, UserResponse

router = APIRouter()


# ──────────────────────────────────────────────────
#  FAVORITES
# ──────────────────────────────────────────────────

@router.post("/me/favorites/{game_id}", status_code=200)
async def toggle_favorite(
    game_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Toggle a game as a favorite for the current user. Returns the new state."""
    game_result = await db.execute(select(Game).where(Game.id == game_id))
    if not game_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Game not found")

    fav_result = await db.execute(
        select(UserFavorite).where(
            UserFavorite.user_id == current_user.id,
            UserFavorite.game_id == game_id,
        )
    )
    existing = fav_result.scalar_one_or_none()

    if existing:
        await db.delete(existing)
        await db.commit()
        return {"favorited": False, "message": "Removed from favorites"}
    else:
        new_fav = UserFavorite(user_id=current_user.id, game_id=game_id)
        db.add(new_fav)
        await db.commit()
        return {"favorited": True, "message": "Added to favorites"}


@router.get("/me/favorites", response_model=List[GameRead])
async def get_my_favorites(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get all favorited games for the current user."""
    result = await db.execute(
        select(UserFavorite)
        .where(UserFavorite.user_id == current_user.id)
        .options(selectinload(UserFavorite.game).selectinload(Game.category))
        .order_by(UserFavorite.created_at.desc())
    )
    favorites = result.scalars().all()
    return [fav.game for fav in favorites]


# ──────────────────────────────────────────────────
#  RECENTLY PLAYED (game sessions)
# ──────────────────────────────────────────────────

@router.post("/me/sessions/{game_id}", status_code=200)
async def record_game_session(
    game_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Record that the current user played a game."""
    game_result = await db.execute(select(Game).where(Game.id == game_id))
    if not game_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Game not found")

    session = UserGameSession(
        user_id=current_user.id,
        game_id=game_id,
        played_at=datetime.utcnow(),
    )
    db.add(session)
    await db.commit()
    return {"recorded": True}


@router.get("/me/sessions", response_model=List[GameRead])
async def get_recently_played(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    limit: int = 10,
) -> Any:
    """
    Return the most recently played games for the current user.
    Distinct by game (only the latest session per game), up to `limit` games.
    """
    from sqlalchemy import func

    # Get latest session per game using window function
    subq = (
        select(
            UserGameSession.game_id,
            UserGameSession.played_at,
            func.row_number().over(
                partition_by=UserGameSession.game_id,
                order_by=desc(UserGameSession.played_at)
            ).label("rn"),
        )
        .where(UserGameSession.user_id == current_user.id)
        .subquery()
    )

    result = await db.execute(
        select(Game)
        .join(subq, Game.id == subq.c.game_id)
        .where(subq.c.rn == 1)
        .options(selectinload(Game.category))
        .order_by(desc(subq.c.played_at))
        .limit(limit)
    )
    return result.scalars().all()


# ──────────────────────────────────────────────────
#  PROFILE MANAGEMENT
# ──────────────────────────────────────────────────

@router.patch("/me", response_model=UserResponse)
async def update_my_profile(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    payload: UserUpdate,
) -> Any:
    """Update the current user's profile (username, email, bio, country, avatar, is_public)."""
    update_data = payload.model_dump(exclude_unset=True)

    if "username" in update_data and update_data["username"] != current_user.username:
        existing = await db.execute(
            select(User).where(User.username == update_data["username"])
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Username already taken")

    if "email" in update_data and update_data["email"] != current_user.email:
        existing = await db.execute(
            select(User).where(User.email == update_data["email"])
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already in use")

    for field, value in update_data.items():
        setattr(current_user, field, value)

    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.patch("/me/password")
async def change_my_password(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    payload: PasswordUpdate,
) -> Any:
    """Change the current user's password."""
    if not security.verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")

    current_user.hashed_password = security.get_password_hash(payload.new_password)
    db.add(current_user)
    await db.commit()
    return {"success": True}


@router.delete("/me", status_code=204)
async def delete_my_account(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> None:
    """Delete the current user's account permanently."""
    await db.delete(current_user)
    await db.commit()
    return None
