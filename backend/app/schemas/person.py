from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime


class PersonResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    active: bool
    created_at: datetime
    updated_at: datetime
    photo_count: int
    
    # New fields for Face ID authentication
    role: Optional[str] = 'user'  # admin, manager, user, guest
    department: Optional[str] = None
    position: Optional[str] = None
    employee_id: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    can_use_face_auth: bool = False


class PersonCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    
    # New fields
    role: Optional[str] = 'user'
    department: Optional[str] = None
    position: Optional[str] = None
    employee_id: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    can_use_face_auth: Optional[bool] = False


class PersonUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    active: Optional[bool] = None
    
    # New fields
    role: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    employee_id: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    can_use_face_auth: Optional[bool] = None


class PersonListResponse(BaseModel):
    persons: List[PersonResponse]
    total: int
    page: int
    size: int
    has_next: bool