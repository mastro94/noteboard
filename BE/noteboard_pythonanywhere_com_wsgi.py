import os, sys
from urllib.parse import quote_plus

project_home = os.path.expanduser('~/noteboard-api')
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# -------- DB URL (MySQL PA) --------
DB_USER = "noteboard"
DB_PASS = os.environ.get("MYSQL_PASS", "Aa1Bb2Cc3")
DB_HOST = "noteboard.mysql.pythonanywhere-services.com"
DB_NAME = "noteboard$notes"
SAFE_PASS = quote_plus(DB_PASS)
os.environ["DB_URL"] = f"mysql+pymysql://{DB_USER}:{SAFE_PASS}@{DB_HOST}/{DB_NAME}"

# -------- CORS: FE origins --------
os.environ["ALLOWED_ORIGINS"] = (
    "http://localhost:5173,"
    "http://127.0.0.1:5173,"
    "https://mastro94.github.io,"
    "https://mastro94.github.io/noteboard"
)

# -------- Firebase Admin --------
os.environ["FIREBASE_CREDENTIALS_JSON"] = "/home/noteboard/noteboard-api/firebase-key.json"
os.environ["FIREBASE_PROJECT_ID"] = "noteboard-dac65"

# (opzionali ma utili)
os.environ.setdefault("SECRET_KEY", "change-this-secret")
os.environ.setdefault("JWT_SECRET", "change-jwt-secret")
os.environ.setdefault("JWT_EXPIRE_HOURS", "72")

from app import app as application
