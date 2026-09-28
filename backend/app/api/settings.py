from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.config import settings
from backend.app.database.database import get_db
from backend.app.database.models import UserSettings
from backend.app.llm.router import llm_router
from backend.app.schemas.settings import SettingsSchema, SettingsUpdateSchema

router = APIRouter()


@router.get("/settings", response_model=SettingsSchema)
async def get_settings(db: AsyncSession = Depends(get_db)):
    db_settings = await db.get(UserSettings, "default")
    if not db_settings:
        db_settings = UserSettings(id="default")
        db.add(db_settings)
        await db.commit()
        await db.refresh(db_settings)

    ollama_active = await llm_router.ollama.is_available()

    return SettingsSchema(
        theme=db_settings.theme,
        default_model=db_settings.default_model or settings.OLLAMA_DEFAULT_MODEL,
        default_provider="ollama",
        temperature=db_settings.temperature,
        max_tokens=db_settings.max_tokens,
        memory_enabled=db_settings.memory_enabled,
        rag_enabled=db_settings.rag_enabled,
        tools_enabled=db_settings.tools_enabled,
        ollama_base_url=settings.OLLAMA_BASE_URL,
        ollama_status=ollama_active,
    )


@router.patch("/settings", response_model=SettingsSchema)
async def update_settings(
    payload: SettingsUpdateSchema,
    db: AsyncSession = Depends(get_db),
):
    db_settings = await db.get(UserSettings, "default")
    if not db_settings:
        db_settings = UserSettings(id="default")
        db.add(db_settings)

    if payload.theme is not None:
        db_settings.theme = payload.theme
    if payload.default_model is not None:
        db_settings.default_model = payload.default_model
    if payload.default_provider is not None:
        db_settings.default_provider = "ollama"
    if payload.temperature is not None:
        db_settings.temperature = payload.temperature
    if payload.max_tokens is not None:
        db_settings.max_tokens = payload.max_tokens
    if payload.memory_enabled is not None:
        db_settings.memory_enabled = payload.memory_enabled
    if payload.rag_enabled is not None:
        db_settings.rag_enabled = payload.rag_enabled
    if payload.tools_enabled is not None:
        db_settings.tools_enabled = payload.tools_enabled

    if payload.ollama_base_url is not None:
        clean_url = payload.ollama_base_url.strip()
        settings.OLLAMA_BASE_URL = clean_url
        llm_router.ollama.base_url = clean_url.rstrip("/")

    await db.commit()
    await db.refresh(db_settings)

    ollama_active = await llm_router.ollama.is_available()

    return SettingsSchema(
        theme=db_settings.theme,
        default_model=db_settings.default_model or settings.OLLAMA_DEFAULT_MODEL,
        default_provider="ollama",
        temperature=db_settings.temperature,
        max_tokens=db_settings.max_tokens,
        memory_enabled=db_settings.memory_enabled,
        rag_enabled=db_settings.rag_enabled,
        tools_enabled=db_settings.tools_enabled,
        ollama_base_url=settings.OLLAMA_BASE_URL,
        ollama_status=ollama_active,
    )
