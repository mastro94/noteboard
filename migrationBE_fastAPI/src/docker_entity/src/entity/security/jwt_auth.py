import os, jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from services.db_service import get_db
from schemas.user import User

JWT_SECRET = os.environ.get("JWT_SECRET", "change-jwt-secret")
security = HTTPBearer(auto_error=False)

def get_current_user(
    cred: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    if not cred or cred.scheme.lower() != "bearer":
        raise HTTPException(401, "Unauthorized")
    try:
        payload = jwt.decode(cred.credentials, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        raise HTTPException(401, "Unauthorized")
    uid = payload.get("uid")
    u = db.get(User, uid) if uid else None
    if not u:
        raise HTTPException(401, "Unauthorized")
    return u
