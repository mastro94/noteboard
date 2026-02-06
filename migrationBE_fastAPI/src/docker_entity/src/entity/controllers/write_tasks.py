from datetime import datetime
from fastapi import HTTPException
from sqlalchemy.orm import Session
from schemas.task import Task, VALID_STATUSES, VALID_PRIORITIES
from controllers._board_acl import get_role_on_board, is_user_in_board

def _require(role: str, allowed: set[str]):
    if role not in allowed:
        raise HTTPException(403, "forbidden")

def create_task(db: Session, user_id: int, board_id: int, body):
    role = get_role_on_board(db, board_id, user_id)
    _require(role, {"admin", "editor"})

    title = (body.title or "").strip()
    if not title:
        raise HTTPException(400, "title required")

    status = body.status or "todo"
    if status not in VALID_STATUSES:
        raise HTTPException(400, "invalid status")

    prio = (body.priority or "LOW").upper()
    if prio not in VALID_PRIORITIES:
        raise HTTPException(400, "invalid priority")

    # assignee policy
    assignee_id = body.assignee_id
    if assignee_id is not None:
        if not is_user_in_board(db, board_id, assignee_id):
            raise HTTPException(400, "assignee_id not in board")
        if role == "editor" and assignee_id != user_id:
            raise HTTPException(403, "editors can assign only to themselves")

    last = (db.query(Task)
            .filter_by(board_id=board_id, status=status)
            .order_by(Task.order_index.desc())
            .first())
    next_idx = (last.order_index + 1) if last else 0

    t = Task(
        user_id=user_id,
        board_id=board_id,
        title=title,
        description=(body.description or None),
        status=status,
        order_index=next_idx,
        priority=prio,
        assignee_id=assignee_id,
        updated_at=datetime.utcnow(),
    )
    db.add(t); db.commit(); db.refresh(t)
    return t

def update_task(db: Session, user_id: int, task_id: int, body):
    role = get_role_on_board(db, body.board_id, user_id)
    _require(role, {"admin", "editor"})

    t = db.query(Task).filter_by(id=task_id, board_id=body.board_id).first()
    if not t:
        raise HTTPException(404, "task not found")

    if role == "editor" and t.user_id != user_id:
        raise HTTPException(403, "editors can modify only their tasks")

    if body.title is not None:
        new_title = body.title.strip()
        if not new_title:
            raise HTTPException(400, "title cannot be empty")
        t.title = new_title

    if body.description is not None:
        t.description = body.description.strip() or None

    if body.status is not None:
        if body.status not in VALID_STATUSES:
            raise HTTPException(400, "invalid status")
        if body.status != t.status:
            last = (db.query(Task)
                    .filter_by(board_id=t.board_id, status=body.status)
                    .order_by(Task.order_index.desc())
                    .first())
            t.status = body.status
            t.order_index = (last.order_index + 1) if last else 0

    if body.order_index is not None:
        t.order_index = int(body.order_index)

    if body.priority is not None:
        pr = body.priority.upper()
        if pr not in VALID_PRIORITIES:
            raise HTTPException(400, "invalid priority")
        t.priority = pr

    if body.assignee_id is not None or body.assignee_id is None:
        # distinguere “campo presente” richiede Pydantic; qui assumiamo che body.assignee_id sia presente quando vuoi cambiarlo
        new_assignee = body.assignee_id
        if new_assignee is not None:
            if not is_user_in_board(db, t.board_id, new_assignee):
                raise HTTPException(400, "assignee_id not in board")
            if role == "editor" and new_assignee != user_id:
                raise HTTPException(403, "editors can assign only to themselves")
        t.assignee_id = new_assignee

    t.updated_at = datetime.utcnow()
    db.commit(); db.refresh(t)
    return t

def delete_task(db: Session, user_id: int, board_id: int, task_id: int):
    role = get_role_on_board(db, board_id, user_id)
    _require(role, {"admin", "editor"})

    t = db.query(Task).filter_by(id=task_id, board_id=board_id).first()
    if not t:
        raise HTTPException(404, "task not found")
    if role == "editor" and t.user_id != user_id:
        raise HTTPException(403, "editors can delete only their tasks")

    db.delete(t); db.commit()

def reorder_tasks(db: Session, user_id: int, board_id: int, status: str, ordered_ids: list[int]):
    role = get_role_on_board(db, board_id, user_id)
    _require(role, {"admin"})
    if status not in VALID_STATUSES or not isinstance(ordered_ids, list):
        raise HTTPException(400, "invalid payload")

    tasks = db.query(Task).filter_by(board_id=board_id, status=status).all()
    id_to_task = {t.id: t for t in tasks}

    for i, tid in enumerate(ordered_ids):
        tid = int(tid)
        if tid in id_to_task:
            id_to_task[tid].order_index = i
            id_to_task[tid].updated_at = datetime.utcnow()

    db.commit()
    return {"ok": True}
