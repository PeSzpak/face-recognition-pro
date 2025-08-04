from pydantic import BaseModel
from typing import List, Optional

class RecognitionRequest(BaseModel):
    image: str  # Base64 encoded image or image URL
    threshold: Optional[float] = 0.6  # Similarity threshold for recognition

class RecognitionResponse(BaseModel):
    recognized: bool
    person_id: Optional[str] = None  # ID of the recognized person
    confidence: Optional[float] = None  # Confidence score of the recognition
    message: Optional[str] = None  # Additional message or error description

class RecognitionLog(BaseModel):
    person_id: str
    timestamp: str  # ISO format timestamp
    confidence: float
    recognized: bool
    image_url: Optional[str] = None  # URL of the image used for recognition