import sys
import os

# Percorso alla tua app
project_home = os.path.expanduser('~/noteboard-api')
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# Variabili d'ambiente (mettile anche in "Environment variables" nella dashboard se preferisci)
os.environ.setdefault("API_KEY", "abc123")
# SQLite (file nella home dell'utente PA)
os.environ.setdefault("DB_URL", "mysql+pymysql://noteboard:Aa1Bb2Cc3@noteboard.mysql.pythonanywhere-services.com/noteboard$default")
# consenti CORS: localhost + GitHub Pages (sostituisci user/repo)
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost:5173,https://<user>.github.io,https://<user>.github.io/<repo>")

from app import app as application  # <-- Flask 'app'
