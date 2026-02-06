from datetime import datetime
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from services.db_service import Base

class Board(Base):
    __tablename__ = "boards"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # owner
    title = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class BoardMember(Base):
    __tablename__ = "board_members"
    id = Column(Integer, primary_key=True)
    board_id = Column(Integer, ForeignKey("boards.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String(20), default="editor")  # viewer/editor/admin
    created_at = Column(DateTime, default=datetime.utcnow)

# DTO
class BoardCreateIn(BaseModel):
    title: str

class BoardRenameIn(BaseModel):
    title: str

class BoardOut(BaseModel):
    id: int
    title: str
    created_at: datetime | None = None
    class Config:
        from_attributes = True
