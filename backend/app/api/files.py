from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database.database import get_db
from backend.app.files.service import file_service
from backend.app.schemas.file import FileInfo, FileUploadResponse

router = APIRouter()


@router.post("/files/upload", response_model=FileUploadResponse)
async def upload_file_endpoint(
    file: UploadFile = File(...),
    conversation_id: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        file_info = await file_service.save_and_index_file(
            upload_file=file,
            db=db,
            conversation_id=conversation_id,
        )
        return FileUploadResponse(
            file=file_info,
            message="File uploaded and indexed into knowledge base successfully.",
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/files", response_model=List[FileInfo])
async def list_files_endpoint(
    conversation_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    return await file_service.list_files(db=db, conversation_id=conversation_id)


@router.delete("/files/{file_id}")
async def delete_file_endpoint(
    file_id: str,
    db: AsyncSession = Depends(get_db),
):
    success = await file_service.delete_file(file_id=file_id, db=db)
    if not success:
        raise HTTPException(status_code=404, detail="File not found")
    return {"message": "File deleted successfully", "id": file_id}


@router.get("/files/{file_id}/content")
@router.get("/files/{file_id}/raw")
async def get_file_content_endpoint(
    file_id: str,
    db: AsyncSession = Depends(get_db),
):
    from pathlib import Path
    from fastapi.responses import FileResponse

    db_file = await file_service.get_file(file_id=file_id, db=db)
    if not db_file:
        raise HTTPException(status_code=404, detail="File record not found")

    file_path = Path(db_file.path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Physical file not found on disk")

    return FileResponse(
        path=str(file_path),
        media_type=db_file.mime_type or "application/octet-stream",
        filename=db_file.original_name,
    )


