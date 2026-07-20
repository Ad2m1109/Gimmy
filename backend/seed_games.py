import asyncio
import os
import sys
sys.path.append(os.path.dirname(__file__))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.category import Category
from app.models.game import Game

# Categories to create
CATEGORIES = [
    {"name": "Puzzle", "slug": "puzzle", "icon": '<path d="M14 10V6a2 2 0 1 1 4 0 2 2 0 0 0 2 2h1a2 2 0 0 1 0 4 2 2 0 1 0 0 4 2 2 0 0 1-2 2h-1a2 2 0 0 0-2 2 2 2 0 1 1-4 0v-1a2 2 0 0 0-2-2 2 2 0 1 1 0-4 2 2 0 0 0 2-2V9a2 2 0 0 1 2-2Z"/>'},
    {"name": "Racing", "slug": "racing", "icon": '<circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17H3v-4l2-5h9l4 5v4h-2M9 8V6h4v2"/>'},
    {"name": "Adventure", "slug": "adventure", "icon": '<path d="M3 6l9-4 9 4-9 4Z"/><path d="M3 6v12l9 4 9-4V6"/><path d="M12 10v10"/>'},
    {"name": "Action", "slug": "action", "icon": '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'},
    {"name": "Strategy", "slug": "strategy", "icon": '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'},
]

# Games to create
GAMES = [
    {
        "title": "2048",
        "slug": "2048",
        "description": "Join the numbers and get to the 2048 tile! A classic sliding tile puzzle game that will test your strategic thinking.",
        "iframe_url": "/games/2048/index.html",
        "category_slug": "puzzle",
        "difficulty": "easy",
        "is_featured": True,
        "is_trending": False,
        "is_new": False,
        "plays": 8420,
        "rating": 4.8,
    },
    {
        "title": "Minesweeper",
        "slug": "minesweeper",
        "description": "Classic Minesweeper game. Uncover all the squares without detonating any mines. Choose your difficulty level!",
        "iframe_url": "/games/minesweeper/index.html",
        "category_slug": "puzzle",
        "difficulty": "medium",
        "is_featured": True,
        "is_trending": True,
        "is_new": False,
        "plays": 6250,
        "rating": 4.6,
    },
    {
        "title": "Super Sudoku",
        "slug": "super-sudoku",
        "description": "Play over 500 Sudoku puzzles ranging from easy to evil. Open source and completely free with no tracking.",
        "iframe_url": "/games/super-sudoku/dist/index.html",
        "category_slug": "puzzle",
        "difficulty": "hard",
        "is_featured": True,
        "is_trending": False,
        "is_new": True,
        "plays": 3180,
        "rating": 4.9,
    },
]


async def seed():
    async with AsyncSessionLocal() as db:
        # Create categories
        category_map = {}
        for cat_data in CATEGORIES:
            result = await db.execute(select(Category).where(Category.slug == cat_data["slug"]))
            existing = result.scalar_one_or_none()
            if existing:
                category_map[cat_data["slug"]] = existing
            else:
                cat = Category(**cat_data)
                db.add(cat)
                await db.commit()
                await db.refresh(cat)
                category_map[cat_data["slug"]] = cat
                print(f"Created category: {cat_data['name']}")

        # Create games
        created = 0
        for game_data in GAMES:
            result = await db.execute(select(Game).where(Game.slug == game_data["slug"]))
            if result.scalar_one_or_none():
                print(f"Game '{game_data['title']}' already exists. Skipping.")
                continue

            cat = category_map.get(game_data["category_slug"])
            if not cat:
                print(f"Category '{game_data['category_slug']}' not found for game '{game_data['title']}'. Skipping.")
                continue

            game = Game(
                title=game_data["title"],
                slug=game_data["slug"],
                description=game_data["description"],
                iframe_url=game_data["iframe_url"],
                category_id=cat.id,
                difficulty=game_data["difficulty"],
                is_featured=game_data["is_featured"],
                is_trending=game_data["is_trending"],
                is_new=game_data["is_new"],
                plays=game_data["plays"],
                rating=game_data["rating"],
            )
            db.add(game)
            await db.commit()
            created += 1
            print(f"Created game: {game_data['title']}")

        # Count totals
        result = await db.execute(select(Game))
        total_games = len(result.scalars().all())
        result = await db.execute(select(Category))
        total_cats = len(result.scalars().all())
        print(f"\nSeed complete! Total: {total_cats} categories, {total_games} games ({created} new)")


if __name__ == "__main__":
    asyncio.run(seed())
