from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import httpx
from backend.app.config import settings
from backend.app.database.database import get_db

router = APIRouter()


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    db_ok = False
    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    ollama_ok = False
    try:
        async with httpx.AsyncClient(timeout=1.5) as client:
            res = await client.get(f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/tags")
            ollama_ok = res.status_code == 200
    except Exception:
        ollama_ok = False

    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "services": {
            "database": db_ok,
            "ollama": ollama_ok,
        },
    }
