from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from .category import Category

class GameBase(BaseModel):
    title: str
    slug: str
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    cover_image: Optional[str] = None
    iframe_url: Optional[str] = None
    difficulty: str = "medium"
    category_id: int
    is_featured: bool = False
    is_trending: bool = False
    is_new: bool = True

class GameCreate(GameBase):
    pass

class GameUpdate(GameBase):
    title: Optional[str] = None
    slug: Optional[str] = None
    category_id: Optional[int] = None

class GameInDBBase(GameBase):
    id: int
    plays: int
    likes: int
    rating: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class Game(GameInDBBase):
    # Optionally include category in the response
    category: Optional[Category] = None

# Alias used by other endpoints
GameRead = Game

class GameList(BaseModel):
    items: list[Game]
    total: int
    page: int
    size: int
