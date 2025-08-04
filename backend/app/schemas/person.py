from pydantic import BaseModel
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


class PersonCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None


class PersonUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    active: Optional[bool] = None


class PersonListResponse(BaseModel):
    persons: List[PersonResponse]
    total: int
    page: int
    size: int
    has_next: bool