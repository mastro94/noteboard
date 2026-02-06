from datetime import datetime
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from services.db_service import Base

VALID_STATUSES = ("todo", "in_progress", "done")
VALID_PRIORITIES = ("LOW", "MEDIUM", "HIGH", "HIGHEST")

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)   # creator
    board_id = Column(Integer, ForeignKey("boards.id"), nullable=False)

    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="todo")
    order_index = Column(Integer, nullable=False, default=0)

    priority = Column(String(10), nullable=False, default="LOW")
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

# DTO
class TaskCreateIn(BaseModel):
    board_id: int
    title: str
    description: str | None = None
    status: str = "todo"
    priority: str = "LOW"
    assignee_id: int | None = None
    tag_ids: list[int] = []

class TaskUpdateIn(BaseModel):
    board_id: int
    title: str | None = None
    description: str | None = None
    status: str | None = None
    order_index: int | None = None
    priority: str | None = None
    assignee_id: int | None = None
    tag_ids: list[int] | None = None

class TaskOut(BaseModel):
    id: int
    user_id: int
    board_id: int
    title: str
    description: str | None
    status: str
    order_index: int
    priority: str
    assignee_id: int | None
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class ReorderIn(BaseModel):
    board_id: int
    status: str
    ordered_ids: list[int]
