from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class FileInfo(BaseModel):
    id: str
    conversation_id: Optional[str] = None
    filename: str
    original_name: str
    mime_type: str
    size: int
    created_at: datetime
    formatted_size: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class FileUploadResponse(BaseModel):
    file: FileInfo
    message: str = "File uploaded and indexed successfully."
