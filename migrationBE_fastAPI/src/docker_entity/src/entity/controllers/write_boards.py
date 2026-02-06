from fastapi import HTTPException
from sqlalchemy.orm import Session
from schemas.board import Board, BoardMember

PROTECT_LAST_BOARD = True

def create_board(db: Session, user_id: int, title: str) -> Board:
    title = (title or "").strip()
    if not title:
        raise HTTPException(400, "title required")
    if len(title) > 100:
        raise HTTPException(400, "title too long (max 100)")
    b = Board(user_id=user_id, title=title)
    db.add(b); db.commit(); db.refresh(b)
    return b

def rename_board(db: Session, user_id: int, board_id: int, title: str) -> Board:
    title = (title or "").strip()
    if not title:
        raise HTTPException(400, "title required")
    if len(title) > 100:
        raise HTTPException(400, "title too long (max 100)")

    b = db.query(Board).filter_by(id=board_id).first()
    if not b:
        raise HTTPException(404, "board not found")
    if b.user_id != user_id:
        raise HTTPException(403, "only owner can rename board")

    b.title = title
    db.commit(); db.refresh(b)
    return b

def delete_board(db: Session, user_id: int, board_id: int) -> None:
    b = db.query(Board).filter_by(id=board_id).first()
    if not b:
        raise HTTPException(404, "board not found")
    if b.user_id != user_id:
        raise HTTPException(403, "only owner can delete board")

    if PROTECT_LAST_BOARD:
        count = db.query(Board).filter_by(user_id=user_id).count()
        if count <= 1:
            raise HTTPException(400, "cannot delete the last board")

    db.query(BoardMember).filter(BoardMember.board_id == b.id).delete(synchronize_session=False)

    # inviti: opzionale (se non esiste ancora schemas/invite.py non rompe)
    try:
        from schemas.invite import BoardInvite
        db.query(BoardInvite).filter(BoardInvite.board_id == b.id).delete(synchronize_session=False)
    except Exception:
        pass

    db.delete(b)
    db.commit()
