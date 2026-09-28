from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database.database import get_db
from backend.app.database.models import TaskModel

router = APIRouter(prefix="/tasks")


class CreateTaskRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: Optional[str] = "normal"


@router.get("")
async def list_tasks(status: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    stmt = select(TaskModel).order_by(TaskModel.created_at.desc()).limit(50)
    if status:
        stmt = stmt.where(TaskModel.status == status.upper())
    res = await db.execute(stmt)
    tasks = res.scalars().all()
    return {
        "tasks": [
            {
                "id": t.id,
                "title": t.title,
                "description": t.description,
                "status": t.status,
                "priority": t.priority,
                "created_at": t.created_at,
            }
            for t in tasks
        ]
    }


@router.post("")
async def create_task(req: CreateTaskRequest, db: AsyncSession = Depends(get_db)):
    task = TaskModel(title=req.title, description=req.description, priority=req.priority, status="PENDING")
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return {"id": task.id, "title": task.title, "status": task.status}
