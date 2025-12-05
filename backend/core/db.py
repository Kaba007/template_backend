from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
#from backend.core.models.auth import Base
from backend.core.models.base import Base
from backend.core.models.auth import User
from backend.core.config import get_settings

settings = get_settings()
# Create engine
engine = create_engine(
    settings.database_url,
    echo=True,  # Set to False in production
    pool_pre_ping=True,  # Verify connections before using them
    pool_size=100,
    max_overflow=150
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Initialize database - create all tables"""
    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency for FastAPI to get database session

    Usage:
        @app.get("/items/")
        def read_items(db: Session = Depends(get_db)):
            return db.query(User).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_db_session() -> Session:
    """
    Get database session for non-FastAPI use
    Remember to close the session after use!

    Usage:
        db = get_db_session()
        try:
            users = db.query(User).all()
        finally:
            db.close()
    """
    return SessionLocal()
