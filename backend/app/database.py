from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

if settings.DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    try:
        # Test connecting to Postgres
        engine = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
        )
        with engine.connect() as conn:
            pass
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(
            f"PostgreSQL ({settings.DATABASE_URL}) недоступен ({e}). Переключаемся на локальную базу данных SQLite (quizforge.db)."
        )
        engine = create_engine(
            "sqlite:///./quizforge.db",
            connect_args={"check_same_thread": False},
        )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
