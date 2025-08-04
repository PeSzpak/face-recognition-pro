from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class RecognitionLogBase(BaseModel):
    person_id: Optional[str] = None
    confidence: float
    image_path: Optional[str] = None
    status: str  # "success", "no_match", "error"
    processing_time: float


class RecognitionLogCreate(RecognitionLogBase):
    pass


class RecognitionLogInDB(RecognitionLogBase):
    id: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class RecognitionLog(RecognitionLogInDB):
    person_name: Optional[str] = None