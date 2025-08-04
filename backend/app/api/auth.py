from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.schemas.user import UserCreate, UserOut
from app.services.auth_service import create_user, authenticate_user
from app.core.database import get_db

router = APIRouter()

@router.post("/register", response_model=UserOut)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = create_user(db, user)
    if db_user is None:
        raise HTTPException(status_code=400, detail="User already exists")
    return db_user

@router.post("/login")
def login(user: UserCreate, db: Session = Depends(get_db)):
    access_token = authenticate_user(db, user)
    if access_token is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"access_token": access_token, "token_type": "bearer"}