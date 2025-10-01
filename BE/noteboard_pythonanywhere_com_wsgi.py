import os, sys
from urllib.parse import quote_plus

project_home = os.path.expanduser('~/noteboard-api')
if project_home not in sys.path:
    sys.path.insert(0, project_home)

DB_USER = "noteboard"
DB_PASS = os.environ.get("MYSQL_PASS", "Aa1Bb2Cc3")
DB_HOST = "noteboard.mysql.pythonanywhere-services.com"
DB_NAME = "noteboard$notes"

SAFE_PASS = quote_plus(DB_PASS)  # evita problemi con @ : / # ecc.
os.environ["DB_URL"] = f"mysql+pymysql://{DB_USER}:{SAFE_PASS}@{DB_HOST}/{DB_NAME}"

# (opzionale) origins FE
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost:5173,https://<user>.github.io,https://<user>.github.io/<repo>")

from app import app as application
