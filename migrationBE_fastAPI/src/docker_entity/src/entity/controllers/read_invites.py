import hashlib
from datetime import datetime
from fastapi import HTTPException
from sqlalchemy.orm import Session
from schemas.invite import BoardInvite
from schemas.board import Board

def _hash(t:str)->str: return hashlib.sha256(t.encode()).hexdigest()

def preview_invite(db:Session, token:str):
    inv=db.query(BoardInvite).filter_by(token_hash=_hash(token)).first()
    if not inv: raise HTTPException(404,"invite not found")
    if inv.status=="pending" and inv.expires_at<datetime.utcnow():
        inv.status="expired"; db.commit()
    b=db.query(Board).filter_by(id=inv.board_id).first()
    return {
        "status":inv.status,"email":inv.email,"role":inv.role,
        "expires_at":inv.expires_at.isoformat(),
        "board":{"id":b.id,"title":b.title,"created_at":b.created_at.isoformat()} if b else None
    }
