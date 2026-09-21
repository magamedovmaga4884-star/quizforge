from app.routers.auth import router as auth_router
from app.routers.subjects import router as subjects_router
from app.routers.tests import router as tests_router
from app.routers.questions import router as questions_router
from app.routers.rooms import router as rooms_router
from app.routers.attempts import router as attempts_router
from app.routers.results import router as results_router

__all__ = [
    "auth_router",
    "subjects_router",
    "tests_router",
    "questions_router",
    "rooms_router",
    "attempts_router",
    "results_router",
]
