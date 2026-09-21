import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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
