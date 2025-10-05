import os, json, jwt
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, abort
from flask_cors import CORS
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, ForeignKey, or_
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
            cred_payload = json.loads(FIREBASE_CREDENTIALS)  # env contiene JSON
        except Exception:
            cred_payload = FIREBASE_CREDENTIALS  # env contiene PATH al file
        cred = fb_credentials.Certificate(cred_payload)
        firebase_admin.initialize_app(cred, {"projectId": FIREBASE_PROJECT_ID or None})
    else:
        firebase_admin.initialize_app()

# ---- DB ----
connect_args = {"check_same_thread": False} if DB_URL.startswith("sqlite") else {}
engine = create_engine(DB_URL, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = scoped_session(sessionmaker(bind=engine))
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id            = Column(Integer, primary_key=True)
    email         = Column(String(255), unique=True, nullable=False)
    username      = Column(String(50),  unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_verified   = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=datetime.utcnow)
    tasks         = relationship("Task", backref="user", cascade="all,delete")

class Task(Base):
    __tablename__ = "tasks"
    id          = Column(Integer, primary_key=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    title       = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status      = Column(String(20), nullable=False, default="todo")
    order_index = Column(Integer, nullable=False, default=0)
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(engine)
VALID_STATUSES = ("todo", "in_progress", "done")

# ---- Helpers ----
def auth_user():
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
    except Exception:
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

# ---- Public ----
@app.get("/")
def root():
    return jsonify({"service": "noteboard-api", "ok": True})

@app.get("/health")
def health():
    return jsonify({"status": "ok"})

# ---- Email/pwd (BE) ----
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
    identifier = (data.get("identifier") or "").strip().lower()  # email o username
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

# ---- Authed APIs ----
@app.get("/me")
def me():
    u, session = auth_user()
    try:
        return jsonify({"id": u.id, "email": u.email, "username": u.username, "is_verified": u.is_verified})
    finally:
        session.close()

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
    description = (data.get("description") or "").strip() or None
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
        t = Task(user_id=u.id, title=title, description=description, status=status, order_index=next_idx)
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
