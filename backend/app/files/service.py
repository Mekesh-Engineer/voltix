import asyncio
import shutil
import uuid
from pathlib import Path
from typing import Optional, List
from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.config import settings
from backend.app.core.exceptions import FileValidationError
from backend.app.core.logging import logger
from backend.app.core.security import sanitize_filename, validate_file_upload
from backend.app.database.models import FileModel
from backend.app.rag.chunker import chunk_text
from backend.app.rag.parser import parse_document
from backend.app.rag.vector_store import vector_store
from backend.app.schemas.file import FileInfo


def format_bytes(size: int) -> str:
    for unit in ["B", "KB", "MB", "GB"]:
        if size < 1024.0:
            return f"{size:.1f} {unit}"
        size /= 1024.0
    return f"{size:.1f} TB"


class FileService:
    def __init__(self, upload_dir: str = settings.UPLOAD_DIR):
        self.upload_dir = Path(upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def save_and_index_file(
        self,
        upload_file: UploadFile,
        db: AsyncSession,
        conversation_id: Optional[str] = None,
    ) -> FileInfo:
        original_name = upload_file.filename or "unknown_file"
        safe_name = sanitize_filename(original_name)

        # Read content to check size
        content = await upload_file.read()
        file_size = len(content)

        validate_file_upload(safe_name, file_size)

        file_id = str(uuid.uuid4())
        saved_filename = f"{file_id}_{safe_name}"
        destination = self.upload_dir / saved_filename

        with open(destination, "wb") as f:
            f.write(content)

        mime_type = upload_file.content_type or "application/octet-stream"

        # Record in DB
        db_file = FileModel(
            id=file_id,
            conversation_id=conversation_id,
            filename=saved_filename,
            original_name=original_name,
            mime_type=mime_type,
            size=file_size,
            path=str(destination),
        )
        db.add(db_file)
        await db.commit()
        await db.refresh(db_file)

        # Parse and index into Vector Store for RAG (non-blocking in thread pool)
        try:
            raw_text = await asyncio.to_thread(parse_document, destination)
            if raw_text:
                clean_text = raw_text.replace("\x00", "")
                if clean_text.strip():
                    chunks = chunk_text(
                        text=clean_text,
                        metadata={"file_id": file_id, "filename": original_name, "conversation_id": conversation_id},
                    )
                    vector_store.add_chunks(chunks)
                    logger.info(f"Successfully indexed file '{original_name}' with {len(chunks)} chunks.")
        except Exception as e:
            logger.error(f"Failed to parse and index file '{original_name}': {e}")

        return FileInfo(
            id=db_file.id,
            conversation_id=db_file.conversation_id,
            filename=db_file.filename,
            original_name=db_file.original_name,
            mime_type=db_file.mime_type,
            size=db_file.size,
            created_at=db_file.created_at,
            formatted_size=format_bytes(db_file.size),
        )

    async def list_files(self, db: AsyncSession, conversation_id: Optional[str] = None) -> List[FileInfo]:
        stmt = select(FileModel).order_by(FileModel.created_at.desc())
        if conversation_id:
            stmt = stmt.where(FileModel.conversation_id == conversation_id)
        result = await db.execute(stmt)
        files = result.scalars().all()
        return [
            FileInfo(
                id=f.id,
                conversation_id=f.conversation_id,
                filename=f.filename,
                original_name=f.original_name,
                mime_type=f.mime_type,
                size=f.size,
                created_at=f.created_at,
                formatted_size=format_bytes(f.size),
            )
            for f in files
        ]

    async def delete_file(self, file_id: str, db: AsyncSession) -> bool:
        db_file = await db.get(FileModel, file_id)
        if not db_file:
            return False

        # Remove physical file
        path = Path(db_file.path)
        if path.exists():
            try:
                path.unlink()
            except Exception as e:
                logger.warning(f"Could not delete physical file: {e}")

        # Remove from vector store
        vector_store.delete_file_chunks(file_id)

        # Remove from DB
        await db.delete(db_file)
        await db.commit()
        return True

    async def get_file(self, file_id: str, db: AsyncSession) -> Optional[FileModel]:
        return await db.get(FileModel, file_id)


file_service = FileService()

