from datetime import datetime
from pydantic import BaseModel, EmailStr
from sqlalchemy import Column,Integer,String,DateTime,ForeignKey
from services.db_service import Base

class BoardInvite(Base):
    __tablename__="board_invites"
    id=Column(Integer,primary_key=True)
    board_id=Column(Integer,ForeignKey("boards.id"),nullable=False)
    email=Column(String(255),nullable=False)
    role=Column(String(20),default="editor")
    token_hash=Column(String(64),nullable=False)
    status=Column(String(20),default="pending")
    expires_at=Column(DateTime,nullable=False)
    invited_by=Column(Integer,ForeignKey("users.id"),nullable=False)
    created_at=Column(DateTime,default=datetime.utcnow)

class InviteCreateIn(BaseModel):
    email: EmailStr
    role: str="editor"

class InviteCreateOut(BaseModel):
    ok: bool
    invite_link: str
    expires_at: datetime
