import time
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.api.router import api_router
from backend.app.config import settings
from backend.app.core.exceptions import AIChatException, ProblemDetails
from backend.app.core.logging import logger
from backend.app.database.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database tables and schema
    logger.info("Initializing database...")
    await init_db()
    logger.info("Database initialized successfully.")
    yield
    # Shutdown
    logger.info("Application shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Production-Ready General-Purpose AI Chatbot Platform supporting Ollama, Cloud Models, RAG, and Tools.",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# CORS Middleware (Defense-in-depth: disallow wildcard * when credentials enabled)
cors_origins = [origin for origin in settings.CORS_ORIGINS if origin != "*"]
if not cors_origins:
    cors_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    request.state.request_id = request_id
    start_time = time.time()
    logger.info(f"[{request_id}] START {request.method} {request.url.path}")

    try:
        response = await call_next(request)
        duration_ms = round((time.time() - start_time) * 1000, 2)
        logger.info(f"[{request_id}] DONE  {request.method} {request.url.path} -> {response.status_code} ({duration_ms}ms)")
        response.headers["X-Request-ID"] = request_id
        return response
    except Exception as exc:
        duration_ms = round((time.time() - start_time) * 1000, 2)
        logger.error(f"[{request_id}] ERROR {request.method} {request.url.path} after {duration_ms}ms: {exc}")
        raise exc


@app.exception_handler(AIChatException)
async def custom_exception_handler(request: Request, exc: AIChatException):
    req_id = getattr(request.state, "request_id", str(uuid.uuid4())[:8])
    problem = ProblemDetails(
        type=f"https://errors.voltix.ai/{exc.__class__.__name__.lower()}",
        title=exc.__class__.__name__,
        status=exc.status_code,
        detail=exc.message,
        instance=request.url.path,
        request_id=req_id,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=problem.model_dump(),
        media_type="application/problem+json",
    )


# Attach API routes
app.include_router(api_router)


@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "version": settings.APP_VERSION,
        "docs": "/api/docs",
        "health": "/api/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
