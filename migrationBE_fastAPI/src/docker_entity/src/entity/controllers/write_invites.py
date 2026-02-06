import os,secrets,hashlib
from datetime import datetime,timedelta
from fastapi import HTTPException
from sqlalchemy.orm import Session
from schemas.invite import BoardInvite
from schemas.user import User
from controllers._board_acl import get_role_on_board,is_user_in_board

def _hash(t:str)->str: return hashlib.sha256(t.encode()).hexdigest()

def create_invite(db:Session, board_id:int, inviter_id:int, email:str, role:str):
    role=(role or "editor").strip()
    if role not in ("viewer","editor","admin"): raise HTTPException(400,"invalid role")
    email=(email or "").strip().lower()
    if not email: raise HTTPException(400,"missing email")
    if get_role_on_board(db,board_id,inviter_id)!="admin": raise HTTPException(403,"forbidden")

    tu=db.query(User).filter(User.email==email).first()
    if tu and is_user_in_board(db,board_id,tu.id): raise HTTPException(409,"user already member")

    db.query(BoardInvite).filter(
        BoardInvite.board_id==board_id, BoardInvite.email==email, BoardInvite.status=="pending"
    ).update({"status":"revoked"},synchronize_session=False)

    token=secrets.token_urlsafe(32)
    inv=BoardInvite(
        board_id=board_id,email=email,role=role,token_hash=_hash(token),
        status="pending",expires_at=datetime.utcnow()+timedelta(days=7),invited_by=inviter_id
    )
    db.add(inv); db.commit(); db.refresh(inv)

    base=os.environ.get("FRONTEND_BASE_URL","https://mastro94.github.io/noteboard").rstrip("/")
    link=f"{base}/#/invite?token={token}"
    return {"ok":True,"invite_link":link,"expires_at":inv.expires_at}

def accept_invite(db:Session, token:str, user_id:int, user_email:str):
    inv=db.query(BoardInvite).filter_by(token_hash=_hash(token)).first()
    if not inv: raise HTTPException(404,"invite not found")
    if inv.status!="pending": raise HTTPException(400,"invite not pending")
    if inv.expires_at<datetime.utcnow():
        inv.status="expired"; db.commit()
        raise HTTPException(400,"invite expired")
    if (user_email or "").strip().lower()!=(inv.email or "").strip().lower():
        raise HTTPException(403,"email mismatch")
    from schemas.board import BoardMember
    ex=db.query(BoardMember).filter_by(board_id=inv.board_id,user_id=user_id).first()
    if not ex: db.add(BoardMember(board_id=inv.board_id,user_id=user_id,role=inv.role))
    inv.status="accepted"; db.commit()
    return {"ok":True,"board_id":inv.board_id}
