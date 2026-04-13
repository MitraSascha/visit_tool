from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.api import auth, contacts, assets, ocr
from app.api import (
    interactions,
    geo,
    export,
    duplicates,
    evaluations,
    projects,
    reminders,
    contact_groups,
    dashboard,
    activity_log,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create DB tables and default admin user on first start."""
    from sqlalchemy import select
    from app.database import Base, engine, AsyncSessionLocal
    import app.models.user   # noqa: F401 — register model
    import app.models.contact  # noqa: F401 — register model
    import app.models.interaction  # noqa: F401 — register model
    import app.models.evaluation  # noqa: F401 — register model
    import app.models.project  # noqa: F401 — register model
    import app.models.reminder  # noqa: F401 — register model
    import app.models.contact_group  # noqa: F401 — register model
    import app.models.activity_log  # noqa: F401 — register model
    from app.models.user import User
    from app.services.auth_service import hash_password

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Migrate existing partner_contact table — add columns if not present
        await conn.execute(__import__('sqlalchemy').text("""
            ALTER TABLE partner_contact
                ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMP,
                ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
                ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
        """))

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.email == "admin@cardvault.app")
        )
        if result.scalar_one_or_none() is None:
            session.add(User(
                email="admin@cardvault.app",
                hashed_password=hash_password("CardVault2026!"),
                full_name="Admin",
                is_active=True,
                is_superuser=True,
            ))
            await session.commit()

    yield  # app runs here

    await engine.dispose()


app = FastAPI(
    title="card-vault API",
    description="Digitales Partner- und Dienstleisterverzeichnis mit Visitenkartenablage",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

_origins = [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory for static file serving
os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

# Include existing routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(assets.router, prefix="/api", tags=["assets"])
app.include_router(ocr.router, prefix="/api/ocr", tags=["ocr"])

# Include new feature routers — geo BEFORE contacts so /contacts/geo/all matches before /{id}
app.include_router(geo.router, prefix="/api/contacts", tags=["geo"])
app.include_router(contacts.router, prefix="/api/contacts", tags=["contacts"])
app.include_router(interactions.router, prefix="/api", tags=["interactions"])
app.include_router(export.router, prefix="/api", tags=["export"])
app.include_router(duplicates.router, prefix="/api", tags=["duplicates"])
app.include_router(evaluations.router, prefix="/api", tags=["evaluations"])
app.include_router(projects.router, prefix="/api", tags=["projects"])
app.include_router(reminders.router, prefix="/api", tags=["reminders"])
app.include_router(contact_groups.router, prefix="/api", tags=["groups"])
app.include_router(dashboard.router, prefix="/api", tags=["dashboard"])
app.include_router(activity_log.router, prefix="/api", tags=["activity"])


@app.get("/api/health", tags=["health"])
async def health_check() -> dict:
    return {"status": "ok", "service": "card-vault"}
