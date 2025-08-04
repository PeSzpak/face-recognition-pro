from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class RecognitionRequest(BaseModel):
    image_base64: Optional[str] = None
    threshold: Optional[float] = None


class RecognitionResult(BaseModel):
    person_id: Optional[str]
    person_name: Optional[str]
    confidence: float
    status: str  # "success", "no_match", "error"
    processing_time: float
    message: Optional[str] = None


class RecognitionLogResponse(BaseModel):
    id: str
    person_id: Optional[str]
    person_name: Optional[str]
    confidence: float
    status: str
    processing_time: float
    created_at: datetime


class RecognitionStatsResponse(BaseModel):
    total_recognitions: int
    successful_recognitions: int
    success_rate: float
    average_confidence: float
    average_processing_time: float
    recognitions_today: int
    recognitions_this_week: int
    recognitions_this_month: int