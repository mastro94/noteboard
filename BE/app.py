import os, jwt
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, abort
from flask_cors import CORS
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base, scoped_session, relationship
from passlib.hash import pbkdf2_sha256

# ---- Config ----
SECRET_KEY = os.environ.get("SECRET_KEY", "change-this-secret")
JWT_SECRET = os.environ.get("JWT_SECRET", "change-jwt-secret")
JWT_EXPIRE_HOURS = int(os.environ.get("JWT_EXPIRE_HOURS", "72"))
DB_URL = os.environ.get("DB_URL", "sqlite:///noteboard.db")
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,https://mastro94.github.io,https://mastro94.github.io/noteboard"
).split(",")]

app = Flask(__name__)
CORS(app, resources={r"/*": {
    "origins": ALLOWED_ORIGINS,
    "methods": ["GET","POST","PATCH","DELETE","OPTIONS"],
    "allow_headers": ["Content-Type","Authorization"],
}})

# ---- DB ----
connect_args = {"check_same_thread": False} if DB_URL.startswith("sqlite") else {}
engine = create_engine(DB_URL, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = scoped_session(sessionmaker(bind=engine))
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_verified = Column(Boolean, default=True)  # registrazione senza email: subito verificato
    created_at = Column(DateTime, default=datetime.utcnow)
    tasks = relationship("Task", backref="user", cascade="all,delete")

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="todo")  # todo|in_progress|done
    order_index = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(engine)

VALID_STATUSES = ("todo", "in_progress", "done")

# ---- Helpers ----
def auth_user():
    """Ritorna (utente, sessione) da Authorization: Bearer <jwt>."""
    hdr = request.headers.get("Authorization", "")
    if not hdr.startswith("Bearer "):
        abort(401)
    token = hdr.split(" ", 1)[1].strip()
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        abort(401)
    uid = data.get("uid")
    session = SessionLocal()
    try:
        u = session.get(User, uid)
        if not u:
            abort(401)
        return u, session
    except:
        session.close()
        abort(401)

def t_task(t: Task):
    return {
        "id": t.id,
        "title": t.title,
        "description": t.description,
        "status": t.status,
        "order_index": t.order_index,
        "created_at": t.created_at.isoformat(),
        "updated_at": t.updated_at.isoformat(),
    }

# ---- Public routes ----
@app.get("/")
def root():
    return jsonify({"service": "noteboard-api", "ok": True})

@app.get("/health")
def health():
    return jsonify({"status": "ok"})

# Register (senza email: utente subito verificato)
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

    # policy password: >=9, almeno un numero e un carattere speciale
    import re
    if len(password) < 9 or not re.search(r"\d", password) or not re.search(r"[^A-Za-z0-9]", password):
        abort(400, "weak password")

    session = SessionLocal()
    try:
        # email o username già esistenti
        if session.query(User).filter((User.email == email) | (User.username == username)).first():
            abort(409, "email or username already exists")

        u = User(
            email=email,
            username=username,
            password_hash=pbkdf2_sha256.hash(password),
            is_verified=True,  # subito verificato
        )
        session.add(u)
        session.commit()
        return jsonify({"ok": True, "message": "Registrazione completata"})
    finally:
        session.close()

# Login
@app.post("/auth/login")
def login():
    data = request.get_json() or {}
    identifier = (data.get("identifier") or "").strip().lower()  # email o username
    password = data.get("password") or ""

    session = SessionLocal()
    try:
        u = session.query(User).filter(
            (User.email == identifier) | (User.username == identifier)
        ).first()
        if not u or not pbkdf2_sha256.verify(password, u.password_hash):
            abort(401, "invalid credentials")

        # opzionale: controllo is_verified (sempre True, ma lasciato per futura email)
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

@app.get("/me")
def me():
    u, session = auth_user()
    try:
        return jsonify({"id": u.id, "email": u.email, "username": u.username, "is_verified": u.is_verified})
    finally:
        session.close()

# ---- Tasks (auth required) ----
@app.get("/tasks")
def list_tasks():
    u, session = auth_user()
    try:
        status = request.args.get("status")
        q = session.query(Task).filter(Task.user_id == u.id)
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
    description = (data.get("description") or "").strip()
    status = data.get("status", "todo")
    if not title:
        abort(400, "title required")
    if status not in VALID_STATUSES:
        abort(400, "invalid status")
    try:
        last = (
            session.query(Task)
            .filter_by(user_id=u.id, status=status)
            .order_by(Task.order_index.desc())
            .first()
        )
        next_idx = (last.order_index + 1) if last else 0
        t = Task(
            user_id=u.id,
            title=title,
            description=description or None,
            status=status,
            order_index=next_idx,
        )
        session.add(t)
        session.commit()
        return jsonify(t_task(t)), 201
    finally:
        session.close()

@app.patch("/tasks/<int:task_id>")
def update_task(task_id):
    u, session = auth_user()
    data = request.get_json() or {}
    try:
        t = session.query(Task).filter_by(id=task_id, user_id=u.id).first()
        if not t:
            abort(404, "task not found")

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
                    .filter_by(user_id=u.id, status=new_status)
                    .order_by(Task.order_index.desc())
                    .first()
                )
                t.status = new_status
                t.order_index = (last.order_index + 1) if last else 0

        if "order_index" in data:
            t.order_index = int(data["order_index"])

        t.updated_at = datetime.utcnow()
        session.commit()
        return jsonify(t_task(t))
    finally:
        session.close()

@app.post("/tasks/reorder")
def reorder_tasks():
    u, session = auth_user()
    data = request.get_json() or {}
    status = data.get("status")
    ordered = data.get("ordered_ids") or []
    if status not in VALID_STATUSES or not isinstance(ordered, list):
        abort(400, "invalid payload")
    try:
        id_to_task = {
            t.id: t
            for t in session.query(Task).filter_by(user_id=u.id, status=status).all()
        }
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
        t = session.query(Task).filter_by(id=task_id, user_id=u.id).first()
        if not t:
            abort(404, "task not found")
        session.delete(t)
        session.commit()
        return "", 204
    finally:
        session.close()

if __name__ == "__main__":
    app.run(debug=True)
