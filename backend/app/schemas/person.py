from pydantic import BaseModel
from typing import List, Optional

class PersonCreate(BaseModel):
    name: str
    photos: List[str]  # URLs or paths to the uploaded photos

class PersonUpdate(BaseModel):
    name: Optional[str] = None
    photos: Optional[List[str]] = None

class Person(BaseModel):
    id: int
    name: str
    photos: List[str]

    class Config:
        orm_mode = True