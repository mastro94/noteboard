from fastapi import HTTPException
from sqlalchemy.orm import Session
from schemas.board import Board, BoardMember

def list_boards(db: Session, user_id: int):
    q_owner = db.query(Board).filter(Board.user_id == user_id)
    q_member = (
        db.query(Board)
        .join(BoardMember, BoardMember.board_id == Board.id)
        .filter(BoardMember.user_id == user_id)
    )
    return q_owner.union(q_member).order_by(Board.created_at.desc(), Board.id.desc()).all()

def my_role(db: Session, board_id: int, user_id: int) -> str:
    b = db.query(Board).filter_by(id=board_id).first()
    if not b:
        raise HTTPException(404, "board not found")
    if b.user_id == user_id:
        return "admin"
    m = db.query(BoardMember).filter_by(board_id=board_id, user_id=user_id).first()
    if not m:
        raise HTTPException(403, "forbidden")
    role = (m.role or "viewer").strip()
    return role if role in ("viewer", "editor", "admin") else "viewer"
