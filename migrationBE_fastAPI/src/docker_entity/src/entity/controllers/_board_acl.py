from fastapi import HTTPException
from sqlalchemy.orm import Session
from schemas.board import Board, BoardMember

def get_role_on_board(db: Session, board_id:int, user_id:int)->str:
    b=db.query(Board).filter_by(id=board_id).first()
    if not b: raise HTTPException(404,"board not found")
    if b.user_id==user_id: return "admin"
    m=db.query(BoardMember).filter_by(board_id=board_id,user_id=user_id).first()
    if not m: raise HTTPException(403,"forbidden")
    r=(m.role or "viewer").strip()
    return r if r in ("viewer","editor","admin") else "viewer"

def is_user_in_board(db:Session, board_id:int, user_id:int)->bool:
    b=db.query(Board).filter_by(id=board_id).first()
    if not b: return False
    if b.user_id==user_id: return True
    return db.query(BoardMember).filter_by(board_id=board_id,user_id=user_id).first() is not None
