from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database.database import get_db
from backend.app.database.models import Artifact

router = APIRouter(prefix="/artifacts")


@router.get("")
async def list_artifacts(run_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    stmt = select(Artifact).order_by(Artifact.created_at.desc()).limit(50)
    if run_id:
        stmt = stmt.where(Artifact.run_id == run_id)
    res = await db.execute(stmt)
    artifacts = res.scalars().all()
    return {
        "artifacts": [
            {
                "id": a.id,
                "name": a.name,
                "file_type": a.file_type,
                "size_bytes": a.size_bytes,
                "version": a.version,
                "run_id": a.run_id,
                "created_at": a.created_at,
            }
            for a in artifacts
        ]
    }


@router.get("/{artifact_id}/download")
async def download_artifact(artifact_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Artifact).where(Artifact.id == artifact_id)
    res = await db.execute(stmt)
    art = res.scalar_one_or_none()
    if not art:
        raise HTTPException(status_code=404, detail="Artifact not found.")

    p = Path(art.file_path)
    if not p.exists():
        raise HTTPException(status_code=404, detail="Artifact file missing on disk.")

    return FileResponse(
        path=str(p),
        filename=art.name,
        media_type="application/octet-stream",
    )
