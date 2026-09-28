from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from backend.app.config import settings
from backend.app.database.models import Base, UserSettings

is_sqlite = "sqlite" in settings.DATABASE_URL
engine_kwargs = {"echo": False}
if is_sqlite:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

engine = create_async_engine(settings.DATABASE_URL, **engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)
async_session_factory = AsyncSessionLocal



async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # Migration check for SQLite to safely add new columns if upgrading existing db
        if is_sqlite:
            from sqlalchemy import text
            try:
                await conn.execute(text("ALTER TABLE conversations ADD COLUMN is_pinned BOOLEAN DEFAULT 0;"))
            except Exception:
                pass
            try:
                await conn.execute(text("ALTER TABLE messages ADD COLUMN parent_id VARCHAR(36);"))
            except Exception:
                pass
            try:
                await conn.execute(text("ALTER TABLE messages ADD COLUMN branch_index INTEGER DEFAULT 0;"))
            except Exception:
                pass
            try:
                await conn.execute(text("ALTER TABLE user_settings ADD COLUMN config_json TEXT;"))
            except Exception:
                pass

    # Initialize default settings record if missing
    async with AsyncSessionLocal() as session:
        result = await session.get(UserSettings, "default")
        if not result:
            default_settings = UserSettings(id="default")
            session.add(default_settings)
            await session.commit()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
