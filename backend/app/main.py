import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, Response
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.database import engine, Base
import app.models  # Ensure all models are registered
from app.routers import (
    auth_router,
    subjects_router,
    tests_router,
    questions_router,
    rooms_router,
    attempts_router,
    results_router,
)
from app.ai.ollama import ollama_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database tables exist
    Base.metadata.create_all(bind=engine)
    # Automatically seed default users and subjects if not present
    try:
        from app.seed import seed_database
        seed_database()
    except Exception as e:
        print(f"[!] Seed note: {e}")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Современная образовательная система тестирования для института QuizForge",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(subjects_router, prefix=settings.API_V1_STR)
app.include_router(tests_router, prefix=settings.API_V1_STR)
app.include_router(questions_router, prefix=settings.API_V1_STR)
app.include_router(rooms_router, prefix=settings.API_V1_STR)
app.include_router(attempts_router, prefix=settings.API_V1_STR)
app.include_router(results_router, prefix=settings.API_V1_STR)

@app.get("/api/health", tags=["system"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
    }

@app.get("/api/ai/status", tags=["system"])
async def ai_status():
    is_healthy, message = await ollama_service.check_health()
    return {
        "available": is_healthy,
        "message": message,
        "model": ollama_service.model,
        "base_url": ollama_service.base_url,
    }

# ---------------------------------------------------------
# Static Frontend Serving (Self-contained Single Process)
# ---------------------------------------------------------
STATIC_CANDIDATES = [
    Path(__file__).resolve().parent.parent.parent / "static_build",
    Path(__file__).resolve().parent.parent / "static_build",
    Path(__file__).resolve().parent.parent.parent / "frontend" / "out",
]
STATIC_DIR = next((d for d in STATIC_CANDIDATES if d.exists()), None)

if STATIC_DIR:
    next_dir = STATIC_DIR / "_next"
    if next_dir.exists():
        app.mount("/_next", StaticFiles(directory=str(next_dir)), name="next_static")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa_frontend(full_path: str):
        # Exclude backend APIs from SPA catch-all
        if (
            full_path.startswith("api")
            or full_path.startswith("docs")
            or full_path.startswith("redoc")
            or full_path.startswith("openapi.json")
        ):
            return JSONResponse(status_code=404, content={"detail": "Not found"})

        # 1. Exact file match
        target = STATIC_DIR / full_path
        if target.is_file():
            return FileResponse(target)

        # 2. Directory match with index.html (e.g. /login -> /login/index.html)
        target_index = STATIC_DIR / full_path / "index.html"
        if target_index.is_file():
            return FileResponse(target_index)

        # 3. Direct HTML file match (e.g. /login.html)
        target_html = STATIC_DIR / f"{full_path}.html"
        if target_html.is_file():
            return FileResponse(target_html)

        # 4. Next.js Dynamic Client Routes Handling
        parts = [p for p in full_path.strip("/").split("/") if p]
        if len(parts) >= 3 and parts[0] == "test":
            candidate = STATIC_DIR / "test" / "default" / parts[2] / "index.html"
            if candidate.is_file():
                return FileResponse(candidate)

        if len(parts) >= 3 and parts[0] == "tests":
            candidate = STATIC_DIR / "tests" / "default" / parts[2] / "index.html"
            if candidate.is_file():
                return FileResponse(candidate)

        # 5. Fallback root index.html
        root_index = STATIC_DIR / "index.html"
        if root_index.is_file():
            return FileResponse(root_index)

        return Response("Not Found", status_code=404)
