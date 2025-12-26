import os, json, jwt, secrets, hashlib
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, abort
from flask_cors import CORS
from sqlalchemy import (
    create_engine, Column, Integer, String, Text, DateTime, Boolean,
    ForeignKey, or_, text
)
from sqlalchemy.orm import sessionmaker, declarative_base, scoped_session, relationship
from passlib.hash import pbkdf2_sha256

import firebase_admin
from firebase_admin import auth as fb_auth, credentials as fb_credentials

# ---- Config ----
SECRET_KEY = os.environ.get("SECRET_KEY", "change-this-secret")
JWT_SECRET = os.environ.get("JWT_SECRET", "change-jwt-secret")
JWT_EXPIRE_HOURS = int(os.environ.get("JWT_EXPIRE_HOURS", "72"))
DB_URL = os.environ.get("DB_URL", "sqlite:///noteboard.db")

FIREBASE_CREDENTIALS = os.environ.get("FIREBASE_CREDENTIALS_JSON", "")
FIREBASE_PROJECT_ID  = os.environ.get("FIREBASE_PROJECT_ID", "")

ALLOWED_ORIGINS = [o.strip() for o in os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,https://mastro94.github.io"
).split(",")]

app = Flask(__name__)
CORS(
    app,
    origins=ALLOWED_ORIGINS,
    methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    supports_credentials=False
)

@app.before_request
def _cors_preflight():
    if request.method == "OPTIONS":
        resp = app.make_response(("", 204))
        origin = request.headers.get("Origin", "")
        if origin in ALLOWED_ORIGINS:
            resp.headers["Access-Control-Allow-Origin"] = origin
            resp.headers["Vary"] = "Origin"
            resp.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
            resp.headers["Access-Control-Allow-Methods"] = "GET,POST,PATCH,DELETE,OPTIONS"
        return resp

@app.after_request
def _cors_headers(resp):
    origin = request.headers.get("Origin", "")
    if origin in ALLOWED_ORIGINS:
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Vary"] = "Origin"
        resp.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
        resp.headers["Access-Control-Allow-Methods"] = "GET,POST,PATCH,DELETE,OPTIONS"
    return resp

# ---- Firebase Admin ----
if not firebase_admin._apps:
    if FIREBASE_CREDENTIALS:
        cred_payload = None
        try:
            cred_payload = json.loads(FIREBASE_CREDENTIALS)
        except Exception:
            cred_payload = FIREBASE_CREDENTIALS
        cred = fb_credentials.Certificate(cred_payload)
        firebase_admin.initialize_app(cred, {"projectId": FIREBASE_PROJECT_ID or None})
    else:
        firebase_admin.initialize_app()

# ---- DB ----
connect_args = {"check_same_thread": False} if DB_URL.startswith("sqlite") else {}
engine = create_engine(DB_URL, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = scoped_session(sessionmaker(bind=engine))
Base = declarative_base()

# ------------------ MODELS ------------------
class User(Base):
    __tablename__ = "users"
    id            = Column(Integer, primary_key=True)
    email         = Column(String(255), unique=True, nullable=False)
    username      = Column(String(50),  unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_verified   = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=datetime.utcnow)
    tasks         = relationship("Task", backref="user", cascade="all,delete")
    tags          = relationship("Tag", backref="user", cascade="all,delete")
    boards        = relationship("Board", backref="user", cascade="all,delete")


class Board(Base):
    __tablename__ = "boards"
    id         = Column(Integer, primary_key=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)  # owner
    title      = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class BoardMember(Base):
    __tablename__ = "board_members"
    id         = Column(Integer, primary_key=True)
    board_id   = Column(Integer, ForeignKey("boards.id"), nullable=False)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    role       = Column(String(20), default="editor")  # viewer/editor/admin
    created_at = Column(DateTime, default=datetime.utcnow)


class BoardInvite(Base):
    __tablename__ = "board_invites"
    id         = Column(Integer, primary_key=True)
    board_id   = Column(Integer, ForeignKey("boards.id"), nullable=False)
    email      = Column(String(255), nullable=False)
    role       = Column(String(20), default="editor")
    token_hash = Column(String(64), nullable=False)  # sha256
    status     = Column(String(20), default="pending")  # pending/accepted/revoked/expired
    expires_at = Column(DateTime, nullable=False)
    invited_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Task(Base):
    __tablename__ = "tasks"
    id          = Column(Integer, primary_key=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)  # owner of the task
    board_id    = Column(Integer, ForeignKey("boards.id"), nullable=False)
    title       = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status      = Column(String(20), nullable=False, default="todo")
    order_index = Column(Integer, nullable=False, default=0)
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow)
    priority    = Column(String(10), nullable=False, default="LOW")


class TaskTag(Base):
    __tablename__ = "task_tags"
    task_id = Column(Integer, ForeignKey("tasks.id"), primary_key=True)
    tag_id  = Column(Integer, ForeignKey("tags.id"),  primary_key=True)


class Tag(Base):
    __tablename__ = "tags"
    id         = Column(Integer, primary_key=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)  # creator
    board_id   = Column(Integer, ForeignKey("boards.id"), nullable=False)
    name       = Column(String(50), nullable=False)
    color      = Column(String(7), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    tasks = relationship("Task", secondary="task_tags", backref="tags")

# ---------- AUTO MIGRATION (SQLite) ----------
def _sqlite_table_exists(session, name: str) -> bool:
    r = session.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name=:n"), {"n": name}).fetchone()
    return bool(r)

def _sqlite_column_exists(session, table: str, col: str) -> bool:
    rows = session.execute(text(f"PRAGMA table_info({table})")).fetchall()
    return any(str(r[1]) == col for r in rows)

def _bootstrap_schema():
    Base.metadata.create_all(engine)
    if not DB_URL.startswith("sqlite"):
        return
    session = SessionLocal()
    try:
        if not _sqlite_table_exists(session, "boards"):
            Base.metadata.create_all(engine)

        if _sqlite_table_exists(session, "tasks") and not _sqlite_column_exists(session, "tasks", "board_id"):
            session.execute(text("ALTER TABLE tasks ADD COLUMN board_id INTEGER"))
            session.commit()

        if _sqlite_table_exists(session, "tags") and not _sqlite_column_exists(session, "tags", "board_id"):
            session.execute(text("ALTER TABLE tags ADD COLUMN board_id INTEGER"))
            session.commit()

        if not _sqlite_table_exists(session, "board_members") or not _sqlite_table_exists(session, "board_invites"):
            Base.metadata.create_all(engine)
    finally:
        session.close()

_bootstrap_schema()

VALID_STATUSES = ("todo", "in_progress", "done")
VALID_PRIORITIES = ("LOW", "MEDIUM", "HIGH", "HIGHEST")

# ------------------ HELPERS ------------------
def _hash_token(t: str) -> str:
    return hashlib.sha256(t.encode("utf-8")).hexdigest()

def auth_user():
    hdr = request.headers.get("Authorization", "")
    if not hdr.startswith("Bearer "):
        abort(401)
    token = hdr.split(" ", 1)[1].strip()
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        abort(401)
    uid_ = data.get("uid")
    session = SessionLocal()
    try:
        u = session.get(User, uid_)
        if not u:
            abort(401)
        return u, session
    except Exception:
        session.close()
        abort(401)

def require_board_access(u, session):
    bid = request.args.get("board_id")
    if bid is None:
        payload = request.get_json(silent=True) or {}
        bid = payload.get("board_id")

    if bid is not None and str(bid).strip() != "":
        try:
            bid_int = int(bid)
        except Exception:
            abort(400, "invalid board_id")
        b = session.query(Board).filter_by(id=bid_int).first()
        if not b:
            abort(404, "board not found")

        is_owner = (b.user_id == u.id)
        is_member = session.query(BoardMember).filter_by(board_id=b.id, user_id=u.id).first() is not None
        if not (is_owner or is_member):
            abort(403, "forbidden")
        return b

    # default board: first existing owner board or create one
    b = session.query(Board).filter_by(user_id=u.id).order_by(Board.id.asc()).first()
    if not b:
        b = Board(user_id=u.id, title="My Board")
        session.add(b)
        session.commit()

        if DB_URL.startswith("sqlite") and _sqlite_column_exists(session, "tasks", "board_id"):
            session.execute(
                text("UPDATE tasks SET board_id=:bid WHERE user_id=:uid AND (board_id IS NULL OR board_id='')"),
                {"bid": b.id, "uid": u.id},
            )
        if DB_URL.startswith("sqlite") and _sqlite_column_exists(session, "tags", "board_id"):
            session.execute(
                text("UPDATE tags SET board_id=:bid WHERE user_id=:uid AND (board_id IS NULL OR board_id='')"),
                {"bid": b.id, "uid": u.id},
            )
        session.commit()

    return b

def get_role_on_board(u, session, board_id: int) -> str:
    b = session.query(Board).filter_by(id=board_id).first()
    if not b:
        abort(404, "board not found")
    if b.user_id == u.id:
        return "admin"  # owner has admin rights
    m = session.query(BoardMember).filter_by(board_id=board_id, user_id=u.id).first()
    if not m:
        abort(403, "forbidden")
    role = (m.role or "viewer").strip()
    if role not in ("viewer", "editor", "admin"):
        role = "viewer"
    return role

def require_role(role: str, allowed: set):
    if role not in allowed:
        abort(403, "forbidden")

def t_board(b: "Board"):
    return {"id": b.id, "title": b.title, "created_at": b.created_at.isoformat() if b.created_at else None}

def t_tag(tag: "Tag"):
    return {"id": tag.id, "name": tag.name, "color": tag.color, "board_id": tag.board_id}

def t_task(t: Task):
    return {
        "id": t.id,
        "title": t.title,
        "description": t.description,
        "status": t.status,
        "order_index": t.order_index,
        "created_at": t.created_at.isoformat(),
        "updated_at": t.updated_at.isoformat(),
        "tags": [t_tag(tag) for tag in (t.tags or [])],
        "priority": t.priority,
        "board_id": t.board_id,
        "user_id": t.user_id,
    }

# ------------------ PUBLIC ------------------
@app.get("/")
def root():
    return jsonify({"service": "noteboard-api", "ok": True})

@app.get("/health")
def health():
    return jsonify({"status": "ok"})

# ------------------ AUTH (email/pwd) ------------------
@app.post("/auth/register")
def register():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    password2 = data.get("password2") or ""
    if not email or not username or not password:
        abort(400, "missing fields")
    if password != password2:
        abort(400, "passwords mismatch")

    import re
    if len(password) < 9 or not re.search(r"\d", password) or not re.search(r"[^A-Za-z0-9]", password):
        abort(400, "weak password")

    session = SessionLocal()
    try:
        if session.query(User).filter(or_(User.email == email, User.username == username)).first():
            abort(409, "email or username already exists")
        u = User(
            email=email,
            username=username,
            password_hash=pbkdf2_sha256.hash(password),
            is_verified=True,
        )
        session.add(u)
        session.commit()
        return jsonify({"ok": True, "message": "Registrazione completata"})
    finally:
        session.close()

@app.post("/auth/login")
def login():
    data = request.get_json() or {}
    identifier = (data.get("identifier") or "").strip().lower()
    password = data.get("password") or ""
    session = SessionLocal()
    try:
        u = session.query(User).filter(or_(User.email == identifier, User.username == identifier)).first()
        if not u or not pbkdf2_sha256.verify(password, u.password_hash):
            abort(401, "invalid credentials")
        if not u.is_verified:
            abort(403, "email not verified")
        token = jwt.encode(
            {"uid": u.id, "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)},
            JWT_SECRET,
            algorithm="HS256",
        )
        return jsonify({"token": token, "user": {"id": u.id, "email": u.email, "username": u.username}})
    finally:
        session.close()

# ---- Firebase token exchange ----
@app.post("/auth/firebase")
def auth_from_firebase():
    data = request.get_json() or {}
    id_token = data.get("id_token")
    if not id_token:
        abort(400, "missing id_token")
    try:
        decoded = fb_auth.verify_id_token(id_token)
    except Exception as e:
        abort(401, f"invalid firebase token: {e}")
    email = (decoded.get("email") or "").lower()
    if not email:
        abort(400, "email missing in firebase token")
    username_guess = (decoded.get("name") or email.split("@")[0])[:50]
    email_verified = bool(decoded.get("email_verified"))

    session = SessionLocal()
    try:
        u = session.query(User).filter(User.email == email).first()
        if not u:
            u = User(
                email=email,
                username=username_guess,
                password_hash=pbkdf2_sha256.hash(os.urandom(16).hex()),
                is_verified=email_verified,
            )
            session.add(u); session.commit()
        else:
            if email_verified and not u.is_verified:
                u.is_verified = True
                session.commit()
        token = jwt.encode(
            {"uid": u.id, "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)},
            JWT_SECRET, algorithm="HS256"
        )
        return jsonify({"token": token, "user": {"id": u.id, "email": u.email, "username": u.username, "is_verified": u.is_verified}})
    finally:
        session.close()

# ------------------ AUTHED APIs ------------------
@app.get("/me")
def me():
    u, session = auth_user()
    try:
        return jsonify({"id": u.id, "email": u.email, "username": u.username, "is_verified": u.is_verified})
    finally:
        session.close()

# ---------- BOARDS ----------
PROTECT_LAST_BOARD = True

@app.get("/boards")
def list_boards():
    u, session = auth_user()
    try:
        q_owner = session.query(Board).filter(Board.user_id == u.id)
        q_member = (
            session.query(Board)
            .join(BoardMember, BoardMember.board_id == Board.id)
            .filter(BoardMember.user_id == u.id)
        )
        rows = q_owner.union(q_member).order_by(Board.created_at.desc(), Board.id.desc()).all()
        return jsonify([t_board(b) for b in rows])
    finally:
        session.close()

@app.post("/boards")
def create_board():
    u, session = auth_user()
    data = request.get_json(force=True) or {}
    title = (data.get("title") or "").strip()
    if not title:
        abort(400, "title required")
    if len(title) > 100:
        abort(400, "title too long (max 100)")
    try:
        b = Board(user_id=u.id, title=title)
        session.add(b)
        session.commit()
        return jsonify(t_board(b)), 201
    finally:
        session.close()

@app.patch("/boards/<int:board_id>")
def rename_board(board_id):
    u, session = auth_user()
    data = request.get_json(force=True) or {}
    title = (data.get("title") or "").strip()
    if not title:
        abort(400, "title required")
    if len(title) > 100:
        abort(400, "title too long (max 100)")
    try:
        b = session.query(Board).filter_by(id=board_id).first()
        if not b:
            abort(404, "board not found")
        if b.user_id != u.id:
            abort(403, "only owner can rename board")
        b.title = title
        session.commit()
        return jsonify(t_board(b))
    finally:
        session.close()

@app.delete("/boards/<int:board_id>")
def delete_board(board_id):
    u, session = auth_user()
    try:
        b = session.query(Board).filter_by(id=board_id).first()
        if not b:
            abort(404, "board not found")
        if b.user_id != u.id:
            abort(403, "only owner can delete board")

        if PROTECT_LAST_BOARD:
            count = session.query(Board).filter_by(user_id=u.id).count()
            if count <= 1:
                abort(400, "cannot delete the last board")

        session.query(BoardMember).filter(BoardMember.board_id == b.id).delete(synchronize_session=False)
        session.query(BoardInvite).filter(BoardInvite.board_id == b.id).delete(synchronize_session=False)

        session.delete(b)
        session.commit()
        return "", 204
    finally:
        session.close()

@app.get("/boards/<int:board_id>/my-role")
def my_role(board_id):
    u, session = auth_user()
    try:
        role = get_role_on_board(u, session, board_id)
        return jsonify({"role": role})
    finally:
        session.close()


# ---------- INVITES ----------
@app.post("/boards/<int:board_id>/invites")
def create_invite(board_id):
    u, session = auth_user()
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    role  = (data.get("role") or "editor").strip()
    if role not in ("viewer", "editor", "admin"):
        abort(400, "invalid role")
    if not email:
        abort(400, "missing email")

    try:
        b = session.query(Board).filter_by(id=board_id).first()
        if not b:
            abort(404, "board not found")

        # ONLY admin (owner) can invite
        role_u = get_role_on_board(u, session, b.id)  # owner => admin, member-role otherwise
        require_role(role_u, {"admin"})

        # already member?
        target_user = session.query(User).filter(User.email == email).first()
        if target_user:
            existing = session.query(BoardMember).filter_by(board_id=b.id, user_id=target_user.id).first()
            if existing:
                abort(409, "user already member")

        # reinvite strategy (keep): revoke pending invites for same email/board
        session.query(BoardInvite).filter(
            BoardInvite.board_id == b.id,
            BoardInvite.email == email,
            BoardInvite.status == "pending"
        ).update({"status": "revoked"}, synchronize_session=False)

        token = secrets.token_urlsafe(32)
        inv = BoardInvite(
            board_id=b.id,
            email=email,
            role=role,
            token_hash=_hash_token(token),
            status="pending",
            expires_at=datetime.utcnow() + timedelta(days=7),
            invited_by=u.id,
        )
        session.add(inv)
        session.commit()

        FRONTEND_BASE_URL = os.environ.get("FRONTEND_BASE_URL", "https://mastro94.github.io/noteboard")
        invite_link = f"{FRONTEND_BASE_URL.rstrip('/')}/#/invite?token={token}"

        return jsonify({"ok": True, "invite_link": invite_link, "expires_at": inv.expires_at.isoformat()})
    finally:
        session.close()

@app.get("/invites/<token>")
def preview_invite(token):
    session = SessionLocal()
    try:
        inv = session.query(BoardInvite).filter_by(token_hash=_hash_token(token)).first()
        if not inv:
            abort(404, "invite not found")
        if inv.status == "pending" and inv.expires_at < datetime.utcnow():
            inv.status = "expired"
            session.commit()
        b = session.query(Board).filter_by(id=inv.board_id).first()
        return jsonify({
            "status": inv.status,
            "email": inv.email,
            "role": inv.role,
            "expires_at": inv.expires_at.isoformat(),
            "board": t_board(b) if b else None
        })
    finally:
        session.close()

@app.post("/invites/<token>/accept")
def accept_invite(token):
    u, session = auth_user()
    try:
        inv = session.query(BoardInvite).filter_by(token_hash=_hash_token(token)).first()
        if not inv:
            abort(404, "invite not found")
        if inv.status != "pending":
            abort(400, "invite not pending")
        if inv.expires_at < datetime.utcnow():
            inv.status = "expired"
            session.commit()
            abort(400, "invite expired")
        if (u.email or "").strip().lower() != (inv.email or "").strip().lower():
            abort(403, "email mismatch")

        existing = session.query(BoardMember).filter_by(board_id=inv.board_id, user_id=u.id).first()
        if not existing:
            session.add(BoardMember(board_id=inv.board_id, user_id=u.id, role=inv.role))
        inv.status = "accepted"
        session.commit()
        return jsonify({"ok": True, "board_id": inv.board_id})
    finally:
        session.close()

# ---------- TAGS CRUD ----------
@app.get("/tags")
def list_tags():
    u, session = auth_user()
    try:
        b = require_board_access(u, session)
        # viewer/editor/admin can read
        tags = session.query(Tag).filter_by(board_id=b.id).order_by(Tag.name.asc()).all()
        return jsonify([t_tag(t) for t in tags])
    finally:
        session.close()

@app.post("/tags")
def create_tag():
    u, session = auth_user()
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    color = (data.get("color") or "").strip() or None
    if not name:
        abort(400, "name is required")
    try:
        b = require_board_access(u, session)
        role_u = get_role_on_board(u, session, b.id)
        # ASSUNZIONE: solo admin gestisce tag
        require_role(role_u, {"admin"})

        exists = session.query(Tag).filter_by(board_id=b.id, name=name).first()
        if exists:
            abort(409, "tag already exists")
        t = Tag(user_id=u.id, board_id=b.id, name=name, color=color)
        session.add(t)
        session.commit()
        return jsonify(t_tag(t)), 201
    finally:
        session.close()

@app.patch("/tags/<int:tag_id>")
def update_tag(tag_id):
    u, session = auth_user()
    data = request.get_json(force=True) or {}
    try:
        b = require_board_access(u, session)
        role_u = get_role_on_board(u, session, b.id)
        require_role(role_u, {"admin"})

        t = session.query(Tag).filter_by(id=tag_id, board_id=b.id).first()
        if not t:
            abort(404, "tag not found")
        if "name" in data:
            name = (data["name"] or "").strip()
            if not name:
                abort(400, "invalid name")
            dup = session.query(Tag).filter(
                Tag.board_id==b.id, Tag.name==name, Tag.id!=t.id
            ).first()
            if dup:
                abort(409, "tag already exists")
            t.name = name
        if "color" in data:
            t.color = (data["color"] or "").strip() or None
        t.updated_at = datetime.utcnow()
        session.commit()
        return jsonify(t_tag(t))
    finally:
        session.close()

@app.delete("/tags/<int:tag_id>")
def delete_tag(tag_id):
    u, session = auth_user()
    try:
        b = require_board_access(u, session)
        role_u = get_role_on_board(u, session, b.id)
        require_role(role_u, {"admin"})

        t = session.query(Tag).filter_by(id=tag_id, board_id=b.id).first()
        if not t:
            abort(404, "tag not found")
        session.query(TaskTag).filter(TaskTag.tag_id == tag_id).delete(synchronize_session=False)
        session.delete(t)
        session.commit()
        return "", 204
    finally:
        session.close()

# ---------- TASKS ----------
@app.get("/tasks")
def list_tasks():
    u, session = auth_user()
    try:
        b = require_board_access(u, session)
        # viewer/editor/admin can read
        status = request.args.get("status")
        q = session.query(Task).filter(Task.board_id == b.id)
        if status:
            if status not in VALID_STATUSES:
                abort(400, "invalid status")
            q = q.filter(Task.status == status)
        rows = q.order_by(Task.status, Task.order_index.asc(), Task.id.asc()).all()
        return jsonify([t_task(x) for x in rows])
    finally:
        session.close()

@app.post("/tasks")
def create_task():
    u, session = auth_user()
    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip() or None
    status = data.get("status", "todo")
    priority = (data.get("priority") or "LOW").upper()
    if priority not in VALID_PRIORITIES:
        abort(400, "invalid priority")
    if not title:
        abort(400, "title required")
    if status not in VALID_STATUSES:
        abort(400, "invalid status")
    try:
        b = require_board_access(u, session)
        role_u = get_role_on_board(u, session, b.id)
        require_role(role_u, {"admin", "editor"})  # viewer cannot create

        last = (
            session.query(Task)
            .filter_by(board_id=b.id, status=status)
            .order_by(Task.order_index.desc())
            .first()
        )
        next_idx = (last.order_index + 1) if last else 0

        t = Task(
            user_id=u.id,
            board_id=b.id,
            title=title,
            description=description,
            status=status,
            order_index=next_idx,
            priority=priority
        )
        session.add(t)

        tag_ids = data.get("tag_ids") or []
        if tag_ids:
            tags = session.query(Tag).filter(Tag.board_id==b.id, Tag.id.in_(tag_ids)).all()
            t.tags = tags

        session.commit()
        return jsonify(t_task(t)), 201
    finally:
        session.close()

@app.patch("/tasks/<int:task_id>")
def update_task(task_id):
    u, session = auth_user()
    data = request.get_json() or {}
    try:
        b = require_board_access(u, session)
        role_u = get_role_on_board(u, session, b.id)
        require_role(role_u, {"admin", "editor"})  # viewer cannot edit

        t = session.query(Task).filter_by(id=task_id, board_id=b.id).first()
        if not t:
            abort(404, "task not found")

        # editor can modify ONLY own tasks
        if role_u == "editor" and t.user_id != u.id:
            abort(403, "editors can modify only their tasks")

        if "title" in data:
            new_title = (data["title"] or "").strip()
            if not new_title:
                abort(400, "title cannot be empty")
            t.title = new_title
        if "description" in data:
            t.description = (data["description"] or "").strip() or None
        if "status" in data:
            new_status = data["status"]
            if new_status not in VALID_STATUSES:
                abort(400, "invalid status")
            if new_status != t.status:
                last = (
                    session.query(Task)
                    .filter_by(board_id=b.id, status=new_status)
                    .order_by(Task.order_index.desc())
                    .first()
                )
                t.status = new_status
                t.order_index = (last.order_index + 1) if last else 0
        if "order_index" in data:
            t.order_index = int(data["order_index"])

        if "tag_ids" in data:
            tag_ids = data.get("tag_ids") or []
            if not isinstance(tag_ids, list):
                abort(400, "tag_ids must be an array")
            new_tags = session.query(Tag).filter(
                Tag.board_id==b.id, Tag.id.in_(tag_ids)
            ).all() if tag_ids else []
            t.tags = new_tags

        if "priority" in data:
            new_prio = (data["priority"] or "").upper()
            if new_prio not in VALID_PRIORITIES:
                abort(400, "invalid priority")
            t.priority = new_prio

        t.updated_at = datetime.utcnow()
        session.commit()
        return jsonify(t_task(t))
    finally:
        session.close()

@app.post("/tasks/reorder")
def reorder_tasks():
    """
    Per semplicità e coerenza con 'editor solo proprie storie':
    - solo admin può fare reorder globale della colonna.
    """
    u, session = auth_user()
    data = request.get_json() or {}
    status = data.get("status")
    ordered = data.get("ordered_ids") or []
    if status not in VALID_STATUSES or not isinstance(ordered, list):
        abort(400, "invalid payload")
    try:
        b = require_board_access(u, session)
        role_u = get_role_on_board(u, session, b.id)
        require_role(role_u, {"admin"})

        id_to_task = {t.id: t for t in session.query(Task).filter_by(board_id=b.id, status=status).all()}
        for i, tid in enumerate(ordered):
            tid = int(tid)
            if tid in id_to_task:
                id_to_task[tid].order_index = i
                id_to_task[tid].updated_at = datetime.utcnow()
        session.commit()
        return jsonify({"ok": True})
    finally:
        session.close()

@app.delete("/tasks/<int:task_id>")
def delete_task(task_id):
    u, session = auth_user()
    try:
        b = require_board_access(u, session)
        role_u = get_role_on_board(u, session, b.id)
        require_role(role_u, {"admin", "editor"})  # viewer cannot delete

        t = session.query(Task).filter_by(id=task_id, board_id=b.id).first()
        if not t:
            abort(404, "task not found")

        if role_u == "editor" and t.user_id != u.id:
            abort(403, "editors can delete only their tasks")

        session.delete(t)
        session.commit()
        return "", 204
    finally:
        session.close()

if __name__ == "__main__":
    app.run(debug=True)
