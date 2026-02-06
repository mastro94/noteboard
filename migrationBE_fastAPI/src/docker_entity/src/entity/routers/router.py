# src/routers/router.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from services.db_service import get_db
from security.jwt_auth import get_current_user
from schemas.auth import RegisterIn, LoginIn
from controllers import write_auth
from schemas.board import BoardCreateIn, BoardRenameIn, BoardOut
from controllers import read_boards, write_boards
from schemas.invite import InviteCreateIn, InviteCreateOut
from controllers import write_invites, read_invites
from schemas.task import TaskCreateIn, TaskUpdateIn, TaskOut, ReorderIn
from controllers import read_tasks, write_tasks



router = APIRouter()

@router.get("/health")
def health():
    return {"status": "ok"}

@router.post("/auth/register")
def register(body: RegisterIn, db: Session = Depends(get_db)):
    return write_auth.register(db, body)

@router.post("/auth/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    return write_auth.login(db, body)

@router.get("/me")
def me(u = Depends(get_current_user)):
    return {"id": u.id, "email": u.email, "username": u.username, "is_verified": u.is_verified}

@router.get("/boards", response_model=list[BoardOut])
def list_boards(db: Session = Depends(get_db), u = Depends(get_current_user)):
    return read_boards.list_boards(db, u.id)

@router.post("/boards", response_model=BoardOut, status_code=201)
def create_board(body: BoardCreateIn, db: Session = Depends(get_db), u = Depends(get_current_user)):
    return write_boards.create_board(db, u.id, body.title)

@router.patch("/boards/{board_id}", response_model=BoardOut)
def rename_board(board_id: int, body: BoardRenameIn, db: Session = Depends(get_db), u = Depends(get_current_user)):
    return write_boards.rename_board(db, u.id, board_id, body.title)

@router.delete("/boards/{board_id}", status_code=204)
def delete_board(board_id: int, db: Session = Depends(get_db), u = Depends(get_current_user)):
    write_boards.delete_board(db, u.id, board_id)
    return None

@router.get("/boards/{board_id}/my-role")
def my_role(board_id: int, db: Session = Depends(get_db), u = Depends(get_current_user)):
    return {"role": read_boards.my_role(db, board_id, u.id)}

@router.post("/boards/{board_id}/invites", response_model=InviteCreateOut)
def create_inv(board_id:int, body:InviteCreateIn, db:Session=Depends(get_db), u=Depends(get_current_user)):
    return write_invites.create_invite(db, board_id, u.id, body.email, body.role)

@router.get("/invites/{token}")
def preview_inv(token:str, db:Session=Depends(get_db)):
    return read_invites.preview_invite(db, token)

@router.post("/invites/{token}/accept")
def accept_inv(token:str, db:Session=Depends(get_db), u=Depends(get_current_user)):
    return write_invites.accept_invite(db, token, u.id, u.email)

@router.get("/tasks", response_model=list[TaskOut])
def list_tasks(board_id: int, status: str | None = None,
              db: Session = Depends(get_db), u = Depends(get_current_user)):
    return read_tasks.list_tasks(db, u.id, board_id, status)

@router.post("/tasks", response_model=TaskOut, status_code=201)
def create_task(body: TaskCreateIn, db: Session = Depends(get_db), u = Depends(get_current_user)):
    return write_tasks.create_task(db, u.id, body.board_id, body)

@router.patch("/tasks/{task_id}", response_model=TaskOut)
def update_task(task_id: int, body: TaskUpdateIn, db: Session = Depends(get_db), u = Depends(get_current_user)):
    return write_tasks.update_task(db, u.id, task_id, body)

@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: int, board_id: int,
                db: Session = Depends(get_db), u = Depends(get_current_user)):
    write_tasks.delete_task(db, u.id, board_id, task_id)
    return None

@router.post("/tasks/reorder")
def reorder(body: ReorderIn, db: Session = Depends(get_db), u = Depends(get_current_user)):
    return write_tasks.reorder_tasks(db, u.id, body.board_id, body.status, body.ordered_ids)
