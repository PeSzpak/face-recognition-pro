from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class PersonBase(BaseModel):
    name: str
    description: Optional[str] = None
    active: bool = True


class PersonCreate(PersonBase):
    pass


class PersonUpdate(PersonBase):
    name: Optional[str] = None
    active: Optional[bool] = None


class PersonInDB(PersonBase):
    id: str
    created_at: datetime
    updated_at: datetime
    photo_count: int = 0
    
    class Config:
        from_attributes = True


class Person(PersonInDB):
    pass


class PersonWithPhotos(Person):
    photos: List[str] = []