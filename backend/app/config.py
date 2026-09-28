import os
from pathlib import Path
from typing import List, Set
from pydantic_settings import BaseSettings

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
PROCESSED_DIR = DATA_DIR / "processed"
VECTOR_DB_DIR = DATA_DIR / "vector_db"
ARTIFACTS_DIR = DATA_DIR / "artifacts"
WORKSPACE_DIR = DATA_DIR / "workspace"

for directory in [DATA_DIR, UPLOADS_DIR, PROCESSED_DIR, VECTOR_DB_DIR, ARTIFACTS_DIR, WORKSPACE_DIR]:
    directory.mkdir(parents=True, exist_ok=True)



class Settings(BaseSettings):
    APP_NAME: str = "Voltix"
    APP_VERSION: str = "2.0.0"
    APP_ENV: str = "development"
    DEBUG: bool = True

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    BACKEND_URL: str = "http://localhost:8000"
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "*",
    ]

    # Database
    DATABASE_URL: str = f"sqlite+aiosqlite:///{DATA_DIR.as_posix()}/app.db"

    # Ollama AI API Service (Permanent Provider)
    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"
    OLLAMA_DEFAULT_MODEL: str = "qwen2.5:7b"
    OLLAMA_TIMEOUT_SECONDS: float = 60.0

    # File uploads & RAG
    UPLOAD_DIR: str = str(UPLOADS_DIR)
    VECTOR_DB_PATH: str = str(VECTOR_DB_DIR)
    ARTIFACTS_PATH: str = str(ARTIFACTS_DIR)
    WORKSPACE_ROOT: str = str(WORKSPACE_DIR)
    MAX_UPLOAD_SIZE_BYTES: int = 25 * 1024 * 1024  # 25 MB
    ALLOWED_EXTENSIONS: Set[str] = {
        "txt", "md", "pdf", "docx", "csv", "xlsx", "pptx", "json", "html",
        "py", "js", "ts", "css",
        "png", "jpg", "jpeg", "webp", "gif", "bmp", "tiff", "tif",
        "svg", "ico", "avif", "heic", "heif", "raw"
    }

    # Agent Runtime 2.0 Limits
    MAX_AGENT_ITERATIONS: int = 25
    AGENT_TOKEN_BUDGET: int = 64000
    AGENT_TIME_BUDGET_SECONDS: int = 300
    AGENT_HUMAN_IN_THE_LOOP_ENABLED: bool = True
    MAX_SUBAGENTS: int = 5
    MAX_SUBAGENT_DEPTH: int = 2

    # Tool Execution Limits
    PYTHON_TOOL_ENABLED: bool = True
    PYTHON_TIMEOUT_SECONDS: int = 15
    PYTHON_MAX_MEMORY_MB: int = 256


    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
