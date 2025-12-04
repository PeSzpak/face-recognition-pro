from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # Database (PostgreSQL direto)
    database_url: str
    
    # Vector Database (Qdrant)
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    qdrant_collection_name: str = "face_embeddings"
    
    # Security
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Face Recognition
    face_recognition_model: str = "Facenet512"
    face_detection_backend: str = "opencv"
    similarity_threshold: float = 0.6
    
    # Upload
    max_file_size: int = 10485760  # 10MB
    allowed_extensions: List[str] = ["jpg", "jpeg", "png"]
    upload_path: str = "./uploads"
    
    # API
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8000
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Create uploads directory if it doesn't exist
def create_upload_dir():
    upload_path = "./uploads"
    if not os.path.exists(upload_path):
        os.makedirs(upload_path)


settings = Settings()
create_upload_dir()
