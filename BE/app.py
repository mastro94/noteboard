import os
from datetime import datetime
from flask import Flask, request, jsonify, abort
from flask_cors import CORS
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base, scoped_session

# -------------------------
# Configurazione
# -------------------------
API_KEY = os.environ.get("API_KEY", "change-me-long-and-random")
DB_URL = os.environ.get("DB_URL", "sqlite:///noteboard.db")

# CORS: consenti localhost e GitHub Pages (sostituisci <user> e <repo> se necessario)
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,https://<user>.github.io,https://<user>.github.io/<repo>"
).split(",")

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": [o.strip() for o in ALLOWED_ORIGINS]}})

# SQLAlchemy
connect_args = {"check_same_thread": False} if DB_URL.startswith("sqlite") else {}
engine = create_engine(DB_URL, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = scoped_session(sessionmaker(bind=engine))
Base = declarative_base()

# -------------------------
# Modello
# -------------------------
VALID_STATUSES = ("todo", "in_progress", "done")

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="todo")  # todo|in_progress|done
    order_index = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(engine)

# -------------------------
# Helpers
# -------------------------
def require_api_key():
    key = request.headers.get("X-API-KEY")
    if key != API_KEY:
        abort(401, description="Invalid API key")

@app.before_request
def _auth():
    # health/root libere
    if request.path in ("/", "/health") or request.method == "OPTIONS":
        return
    require_api_key()

def tdict(t: Task):
    return {
        "id": t.id,
        "title": t.title,
        "description": t.description,
        "status": t.status,
        "order_index": t.order_index,
        "created_at": t.created_at.isoformat(),
        "updated_at": t.updated_at.isoformat(),
    }

def normalize_column(session, status: str):
    """Compatta gli order_index 0..n-1 dentro una colonna."""
    rows = (
        session.query(Task)
        .filter(Task.status == status)
        .order_by(Task.order_index.asc(), Task.id.asc())
        .all()
    )
    for i, r in enumerate(rows):
        if r.order_index != i:
            r.order_index = i
            r.updated_at = datetime.utcnow()

# -------------------------
# Routes
# -------------------------
@app.get("/")
def root():
    return jsonify({"service": "noteboard-api", "ok": True})

@app.get("/health")
def health():
    return jsonify({"status": "ok"})

@app.get("/tasks")
def list_tasks():
    session = SessionLocal()
    try:
        status = request.args.get("status")
        q = session.query(Task)
        if status:
            if status not in VALID_STATUSES:
                abort(400, description="invalid status")
            q = q.filter(Task.status == status)
        tasks = q.order_by(Task.status, Task.order_index.asc(), Task.id.asc()).all()
        return jsonify([tdict(t) for t in tasks])
    finally:
        session.close()

@app.post("/tasks")
def create_task():
    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    status = data.get("status", "todo")
    if not title:
        abort(400, description="title is required")
    if status not in VALID_STATUSES:
        abort(400, description="invalid status")

    session = SessionLocal()
    try:
        # ultimo index nella colonna
        last = (
            session.query(Task)
            .filter(Task.status == status)
            .order_by(Task.order_index.desc())
            .first()
        )
        next_idx = (last.order_index + 1) if last else 0
        t = Task(
            title=title,
            description=description,
            status=status,
            order_index=next_idx,
        )
        session.add(t)
        session.commit()
        return jsonify(tdict(t)), 201
    finally:
        session.close()

@app.patch("/tasks/<int:task_id>")
def update_task(task_id):
    data = request.get_json() or {}
    session = SessionLocal()
    try:
        t = session.get(Task, task_id)
        if not t:
            abort(404, description="task not found")

        # Aggiornamenti consentiti
        if "title" in data:
            new_title = (data["title"] or "").strip()
            if not new_title:
                abort(400, description="title cannot be empty")
            t.title = new_title

        if "description" in data:
            t.description = (data["description"] or "").strip()

        if "status" in data:
            new_status = data["status"]
            if new_status not in VALID_STATUSES:
                abort(400, description="invalid status")
            if new_status != t.status:
                # Spostamento di colonna: assegnalo in coda alla nuova
                t.status = new_status
                last = (
                    session.query(Task)
                    .filter(Task.status == new_status)
                    .order_by(Task.order_index.desc())
                    .first()
                )
                t.order_index = (last.order_index + 1) if last else 0
                # normalizza la colonna di origine
                # (facoltativo, per mantenere indici compatti)
                # normalize_column(session, old_status)  # se salvi old_status prima

        if "order_index" in data:
            try:
                t.order_index = int(data["order_index"])
            except Exception:
                abort(400, description="order_index must be int")

        t.updated_at = datetime.utcnow()
        session.commit()
        return jsonify(tdict(t))
    finally:
        session.close()

@app.post("/tasks/reorder")
def reorder_tasks():
    """
    Body: { "status": "todo|in_progress|done", "ordered_ids": [3,5,1,...] }
    Reindicizza gli order_index per la colonna indicata, seguendo ordered_ids.
    """
    data = request.get_json() or {}
    status = data.get("status")
    ordered_ids = data.get("ordered_ids") or []
    if status not in VALID_STATUSES or not isinstance(ordered_ids, list):
        abort(400, description="invalid payload")

    session = SessionLocal()
    try:
        id_to_task = {
            t.id: t
            for t in session.query(Task).filter(Task.status == status).all()
        }
        # assegna gli indici solo ai presenti nella colonna
        for i, tid in enumerate(ordered_ids):
            tid = int(tid)
            if tid in id_to_task:
                id_to_task[tid].order_index = i
                id_to_task[tid].updated_at = datetime.utcnow()

        # per sicurezza compatta tutto
        normalize_column(session, status)
        session.commit()
        return jsonify({"ok": True})
    finally:
        session.close()

@app.delete("/tasks/<int:task_id>")
def delete_task(task_id):
    session = SessionLocal()
    try:
        t = session.get(Task, task_id)
        if not t:
            abort(404, description="task not found")
        status = t.status
        session.delete(t)
        session.commit()
        # compatta la colonna dopo la cancellazione
        session = SessionLocal()
        normalize_column(session, status)
        session.commit()
        return "", 204
    finally:
        session.close()

# -------------------------
# Entrypoint dev
# -------------------------
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
