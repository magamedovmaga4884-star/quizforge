import os
import sys
from pathlib import Path

# Add backend directory to sys.path so app modules import cleanly
ROOT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT_DIR / "backend"))

# Fallback to SQLite if DATABASE_URL is not set or empty
if not os.environ.get("DATABASE_URL"):
    os.environ["DATABASE_URL"] = f"sqlite:///{ROOT_DIR / 'quizforge.db'}"

import uvicorn
from app.main import app

if __name__ == "__main__":
    # Bot-Hosting passes the allocated port in PORT or SERVER_PORT
    port_env = os.environ.get("PORT") or os.environ.get("SERVER_PORT") or "8000"
    try:
        port = int(port_env)
    except ValueError:
        port = 8000

    host = "0.0.0.0"
    print(f"==================================================")
    print(f"[*] QuizForge успешно инициализирован!")
    print(f"[*] Сервер запускается на http://{host}:{port}")
    print(f"[*] Swagger UI документация: http://{host}:{port}/docs")
    print(f"==================================================")
    uvicorn.run(app, host=host, port=port)
