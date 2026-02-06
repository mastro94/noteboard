from fastapi import HTTPException
from sqlalchemy.orm import Session
from schemas.task import Task, VALID_STATUSES
from controllers._board_acl import get_role_on_board

def list_tasks(db: Session, user_id: int, board_id: int, status: str | None):
    # access check: viewer/editor/admin allowed
    _ = get_role_on_board(db, board_id, user_id)

    q = db.query(Task).filter(Task.board_id == board_id)
    if status:
        if status not in VALID_STATUSES:
            raise HTTPException(400, "invalid status")
        q = q.filter(Task.status == status)
    return q.order_by(Task.status, Task.order_index.asc(), Task.id.asc()).all()
