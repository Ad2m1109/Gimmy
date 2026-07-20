import asyncio
import os
import sys
sys.path.append(os.path.dirname(__file__))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.category import Category
from app.models.game import Game

async def seed():
    async with AsyncSessionLocal() as db:
        # Check if already seeded
        result = await db.execute(select(Category))
        if result.scalars().first():
            print("Database already seeded!")
            return

        # Add Categories
        cat_racing = Category(name="Racing", slug="racing", icon='<circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17H3v-4l2-5h9l4 5v4h-2M9 8V6h4v2"/>')
        cat_adventure = Category(name="Adventure", slug="adventure", icon='<path d="M3 6l9-4 9 4-9 4Z"/><path d="M3 6v12l9 4 9-4V6"/><path d="M12 10v10"/>')
        cat_puzzle = Category(name="Puzzle", slug="puzzle", icon='<path d="M14 10V6a2 2 0 1 1 4 0 2 2 0 0 0 2 2h1a2 2 0 0 1 0 4 2 2 0 1 0 0 4 2 2 0 0 1-2 2h-1a2 2 0 0 0-2 2 2 2 0 1 1-4 0v-1a2 2 0 0 0-2-2 2 2 0 1 1 0-4 2 2 0 0 0 2-2V9a2 2 0 0 1 2-2Z"/>')
        
        db.add_all([cat_racing, cat_adventure, cat_puzzle])
        await db.commit()
        await db.refresh(cat_racing)
        await db.refresh(cat_adventure)
        await db.refresh(cat_puzzle)

        # Add Games
        games = [
            Game(title="Nebula Drift", slug="nebula-drift", description="Fast-paced space racing", category_id=cat_racing.id, plays=12480, rating=4.9, is_featured=True, is_trending=False),
            Game(title="Shadow Realm", slug="shadow-realm", description="Dark fantasy adventure", category_id=cat_adventure.id, plays=8920, rating=4.7, is_featured=True, is_trending=False),
            Game(title="Block Cascade", slug="block-cascade", description="Tetris-like puzzle", category_id=cat_puzzle.id, plays=15310, rating=4.8, is_featured=True, is_trending=True),
            Game(title="Vortex.io", slug="vortex-io", description="Multiplayer io game", category_id=cat_racing.id, plays=5000, rating=4.7, is_featured=False, is_trending=True)
        ]
        
        db.add_all(games)
        await db.commit()
        print("Database successfully seeded!")

if __name__ == "__main__":
    asyncio.run(seed())
