from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload

from app.api import deps
from app.models.game import Game
from app.models.category import Category
from app.schemas.game import Game as GameSchema, GameList

router = APIRouter()

@router.get("", response_model=GameList)
async def read_games(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    search: Optional[str] = None,
    difficulty: Optional[str] = None,
    sort: Optional[str] = "popular",
    featured: Optional[bool] = None,
    trending: Optional[bool] = None,
) -> Any:
    """
    Retrieve games with optional filtering, search, and sorting.
    """
    # Base query
    query = select(Game).options(selectinload(Game.category))
    count_query = select(func.count(Game.id))

    # Apply filters
    if category:
        query = query.join(Game.category).where(Category.slug == category)
        count_query = count_query.join(Category).where(Category.slug == category)

    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                Game.title.ilike(search_pattern),
                Game.description.ilike(search_pattern),
            )
        )
        count_query = count_query.where(
            or_(
                Game.title.ilike(search_pattern),
                Game.description.ilike(search_pattern),
            )
        )

    if difficulty:
        query = query.where(Game.difficulty == difficulty)
        count_query = count_query.where(Game.difficulty == difficulty)

    if featured is not None:
        query = query.where(Game.is_featured == featured)
        count_query = count_query.where(Game.is_featured == featured)

    if trending is not None:
        query = query.where(Game.is_trending == trending)
        count_query = count_query.where(Game.is_trending == trending)

    # Apply sorting
    if sort == "popular":
        query = query.order_by(Game.plays.desc())
    elif sort == "newest":
        query = query.order_by(Game.created_at.desc())
    elif sort == "rating":
        query = query.order_by(Game.rating.desc())
    elif sort == "name":
        query = query.order_by(Game.title.asc())
    else:
        query = query.order_by(Game.plays.desc())

    # Count total
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Get items
    result = await db.execute(query.offset(skip).limit(limit))
    games = result.scalars().all()

    return {
        "items": games,
        "total": total,
        "page": (skip // limit) + 1 if limit > 0 else 1,
        "size": limit,
    }


@router.get("/featured", response_model=list[GameSchema])
async def read_featured_games(
    db: AsyncSession = Depends(deps.get_db),
    limit: int = 10,
) -> Any:
    """Get featured games."""
    result = await db.execute(
        select(Game)
        .where(Game.is_featured == True)
        .options(selectinload(Game.category))
        .order_by(Game.plays.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/trending", response_model=list[GameSchema])
async def read_trending_games(
    db: AsyncSession = Depends(deps.get_db),
    limit: int = 10,
) -> Any:
    """Get trending games."""
    result = await db.execute(
        select(Game)
        .where(Game.is_trending == True)
        .options(selectinload(Game.category))
        .order_by(Game.plays.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.post("/{game_id}/play", status_code=200)
async def record_play(
    game_id: int,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """Increment play count for a game."""
    result = await db.execute(select(Game).where(Game.id == game_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    game.plays += 1
    db.add(game)
    await db.commit()
    return {"plays": game.plays}


@router.get("/{slug}", response_model=GameSchema)
async def read_game_by_slug(
    slug: str,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """
    Get a specific game by slug.
    """
    result = await db.execute(
        select(Game)
        .where(Game.slug == slug)
        .options(selectinload(Game.category))
    )
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return game
