from fastapi import Depends
from sqlalchemy.orm import Session
from .core.database import get_db
from .core.security import get_current_user

def get_db_session() -> Session:
    db = get_db()
    try:
        yield db
    finally:
        db.close()

def get_current_active_user(current_user: str = Depends(get_current_user)):
    return current_user