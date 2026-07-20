import asyncio
import os
import sys
sys.path.append(os.path.dirname(__file__))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.user import User

ADMIN_EMAIL = "admin@gimmy.com"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"


async def create_admin():
    async with AsyncSessionLocal() as db:
        # Check if admin already exists
        result = await db.execute(select(User).where(User.email == ADMIN_EMAIL))
        existing = result.scalar_one_or_none()
        if existing:
            # Upgrade to admin if not already
            if existing.role != "admin":
                existing.role = "admin"
                db.add(existing)
                await db.commit()
                print(f"Updated '{ADMIN_USERNAME}' to admin role.")
            else:
                print(f"Admin '{ADMIN_USERNAME}' already exists.")
            return

        # Create admin user
        user = User(
            email=ADMIN_EMAIL,
            username=ADMIN_USERNAME,
            hashed_password=get_password_hash(ADMIN_PASSWORD),
            role="admin",
            is_verified=True,
            is_active=True,
        )
        db.add(user)
        await db.commit()
        print(f"Admin created!")
        print(f"  Email:    {ADMIN_EMAIL}")
        print(f"  Username: {ADMIN_USERNAME}")
        print(f"  Password: {ADMIN_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(create_admin())
