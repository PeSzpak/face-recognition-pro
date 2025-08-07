from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime


class PersonBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    department: Optional[str] = None
    position: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None


class PersonCreate(PersonBase):
    pass


class PersonUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    department: Optional[str] = None
    position: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class PersonResponse(PersonBase):
    id: str
    photos: List[str]
    status: str
    created_at: str
    last_recognition: Optional[str] = None
    recognition_count: int = 0

    class Config:
        from_attributes = True


class PersonListResponse(BaseModel):
    persons: List[PersonResponse]
    total: int
    page: int
    size: int
    has_next: bool