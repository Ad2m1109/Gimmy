import os
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api import deps
from app.models.game import Game
from app.models.category import Category
from app.models.user import User
from app.schemas.game import GameCreate, GameUpdate, Game as GameSchema

router = APIRouter()

GAMES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))), "static", "games")


def require_admin(current_user: User):
    """Check if user is admin."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")


@router.get("/game-folders")
async def list_game_folders(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """List available game folders in static/games/ directory."""
    require_admin(current_user)
    if not os.path.isdir(GAMES_DIR):
        return []
    folders = sorted([
        f for f in os.listdir(GAMES_DIR)
        if os.path.isdir(os.path.join(GAMES_DIR, f))
    ])
    return [
        {
            "name": f,
            "has_index": os.path.isfile(os.path.join(GAMES_DIR, f, "index.html")),
            "iframe_url": f"/games/{f}/index.html",
        }
        for f in folders
    ]


@router.get("/games", response_model=list[GameSchema])
async def admin_list_games(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """List all games for admin."""
    require_admin(current_user)
    result = await db.execute(
        select(Game)
        .options(selectinload(Game.category))
        .order_by(Game.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


@router.post("/games", response_model=GameSchema, status_code=201)
async def admin_create_game(
    game_in: GameCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Create a new game (admin only)."""
    require_admin(current_user)

    # Check if slug already exists
    existing = await db.execute(select(Game).where(Game.slug == game_in.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Game with this slug already exists")

    # Check if category exists
    cat_result = await db.execute(select(Category).where(Category.id == game_in.category_id))
    if not cat_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Category not found")

    game = Game(**game_in.model_dump())
    db.add(game)
    await db.commit()
    await db.refresh(game)
    return game


@router.get("/games/{game_id}", response_model=GameSchema)
async def admin_get_game(
    game_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get game details for admin."""
    require_admin(current_user)
    result = await db.execute(
        select(Game).where(Game.id == game_id).options(selectinload(Game.category))
    )
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return game


@router.put("/games/{game_id}", response_model=GameSchema)
async def admin_update_game(
    game_id: int,
    game_in: GameUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Update a game (admin only)."""
    require_admin(current_user)
    result = await db.execute(select(Game).where(Game.id == game_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    update_data = game_in.model_dump(exclude_unset=True)
    if "category_id" in update_data:
        cat_result = await db.execute(select(Category).where(Category.id == update_data["category_id"]))
        if not cat_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Category not found")

    for field, value in update_data.items():
        setattr(game, field, value)

    db.add(game)
    await db.commit()
    await db.refresh(game)
    return game


@router.delete("/games/{game_id}", status_code=204)
async def admin_delete_game(
    game_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> None:
    """Delete a game (admin only)."""
    require_admin(current_user)
    result = await db.execute(select(Game).where(Game.id == game_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    await db.delete(game)
    await db.commit()


@router.patch("/games/{game_id}/toggle-featured", response_model=GameSchema)
async def admin_toggle_featured(
    game_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Toggle featured status of a game."""
    require_admin(current_user)
    result = await db.execute(select(Game).where(Game.id == game_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    game.is_featured = not game.is_featured
    db.add(game)
    await db.commit()
    await db.refresh(game)
    return game


@router.patch("/games/{game_id}/toggle-trending", response_model=GameSchema)
async def admin_toggle_trending(
    game_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Toggle trending status of a game."""
    require_admin(current_user)
    result = await db.execute(select(Game).where(Game.id == game_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    game.is_trending = not game.is_trending
    db.add(game)
    await db.commit()
    await db.refresh(game)
    return game


@router.get("/users", response_model=list[dict])
async def admin_list_users(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """List all users for admin."""
    require_admin(current_user)
    result = await db.execute(select(User).offset(skip).limit(limit))
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "is_verified": u.is_verified,
            "created_at": str(u.created_at),
        }
        for u in users
    ]
