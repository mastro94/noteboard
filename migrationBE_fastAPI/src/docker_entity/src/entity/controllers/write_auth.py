import re, os, jwt
from datetime import datetime, timedelta
from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session
from passlib.hash import pbkdf2_sha256
from schemas.user import User
from schemas.auth import RegisterIn, LoginIn

JWT_SECRET = os.environ.get("JWT_SECRET", "change-jwt-secret")
JWT_EXPIRE_HOURS = int(os.environ.get("JWT_EXPIRE_HOURS", "72"))

def _weak(p: str) -> bool:
    return len(p) < 9 or not re.search(r"\d", p) or not re.search(r"[^A-Za-z0-9]", p)

def register(db: Session, body: RegisterIn):
    email = body.email.strip().lower()
    username = body.username.strip()
    if not email or not username or not body.password:
        raise HTTPException(400, "missing fields")
    if body.password != body.password2:
        raise HTTPException(400, "passwords mismatch")
    if _weak(body.password):
        raise HTTPException(400, "weak password")

    exists = db.query(User).filter(or_(User.email == email, User.username == username)).first()
    if exists:
        raise HTTPException(409, "email or username already exists")

    u = User(email=email, username=username, password_hash=pbkdf2_sha256.hash(body.password), is_verified=True)
    db.add(u); db.commit(); db.refresh(u)
    return {"ok": True, "message": "Registrazione completata"}

def login(db: Session, body: LoginIn):
    identifier = body.identifier.strip().lower()
    u = db.query(User).filter(or_(User.email == identifier, User.username == identifier)).first()
    if not u or not pbkdf2_sha256.verify(body.password, u.password_hash):
        raise HTTPException(401, "invalid credentials")
    if not u.is_verified:
        raise HTTPException(403, "email not verified")

    token = jwt.encode(
        {"uid": u.id, "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)},
        JWT_SECRET,
        algorithm="HS256",
    )
    return {"token": token, "user": {"id": u.id, "email": u.email, "username": u.username, "is_verified": u.is_verified}}
