"""
init_db.py — Creates all tables and a default admin user on first run.

Usage:
    python init_db.py

The script is idempotent: running it multiple times is safe.
"""
import asyncio
import sys

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Ensure project root is on the path when run directly
sys.path.insert(0, ".")

from app.database import Base, engine, AsyncSessionLocal
from app.models import Base as _Base  # noqa: F401 — registers all models
import app.models.user  # noqa: F401
import app.models.contact  # noqa: F401
from app.models.user import User
from app.services.auth_service import hash_password

_DEFAULT_EMAIL = "admin@card-vault.local"
_DEFAULT_PASSWORD = "CardVault2026!"
_DEFAULT_NAME = "Admin"


async def create_tables() -> None:
    print("Creating database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created (or already exist).")


async def create_default_admin(session: AsyncSession) -> None:
    result = await session.execute(select(User).where(User.email == _DEFAULT_EMAIL))
    existing = result.scalar_one_or_none()

    if existing is not None:
        print(f"Default admin user already exists: {_DEFAULT_EMAIL}")
        return

    admin = User(
        email=_DEFAULT_EMAIL,
        hashed_password=hash_password(_DEFAULT_PASSWORD),
        full_name=_DEFAULT_NAME,
        is_active=True,
        is_superuser=True,
    )
    session.add(admin)
    await session.commit()
    print(f"Default admin user created:")
    print(f"  Email   : {_DEFAULT_EMAIL}")
    print(f"  Password: {_DEFAULT_PASSWORD}")
    print("  IMPORTANT: Change the password after first login!")


async def main() -> None:
    await create_tables()

    async with AsyncSessionLocal() as session:
        await create_default_admin(session)

    await engine.dispose()
    print("Initialization complete.")


if __name__ == "__main__":
    asyncio.run(main())
