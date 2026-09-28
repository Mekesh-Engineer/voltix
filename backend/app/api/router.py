from fastapi import APIRouter
from backend.app.api.health import router as health_router
from backend.app.api.chat import router as chat_router
from backend.app.api.conversations import router as conversations_router
from backend.app.api.models import router as models_router
from backend.app.api.files import router as files_router
from backend.app.api.settings import router as settings_router
from backend.app.api.agent import router as agent_router
from backend.app.api.artifacts import router as artifacts_router
from backend.app.api.tasks import router as tasks_router
from backend.app.api.aetherion import router as aetherion_router

api_router = APIRouter(prefix="/api")

# Sub-routers for v1 versioning
v1_router = APIRouter(prefix="/v1")

for r, tag in [
    (health_router, "Health"),
    (chat_router, "Chat"),
    (conversations_router, "Conversations"),
    (models_router, "Models"),
    (files_router, "Files"),
    (settings_router, "Settings"),
    (agent_router, "Agent"),
    (artifacts_router, "Artifacts"),
    (tasks_router, "Tasks"),
    (aetherion_router, "Aetherion"),
]:
    v1_router.include_router(r, tags=[tag])
    api_router.include_router(r, tags=[tag])

from backend.app.api.agent import list_tools
api_router.add_api_route("/tools", list_tools, methods=["GET"], tags=["Tools"])
v1_router.add_api_route("/tools", list_tools, methods=["GET"], tags=["Tools"])

api_router.include_router(v1_router)
