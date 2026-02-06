# src/entity/main.py
import os
from pathlib import Path
import uvicorn

if __name__ == "__main__":
    # risali a .../src
    src_root = Path(__file__).resolve().parents[1]

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=True,
        app_dir=str(src_root),
        reload_dirs=[str(src_root)],
        log_level="debug",
    )
