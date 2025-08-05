from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # API
    SECRET_KEY: str = "face-recognition-pro-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Supabase
    SUPABASE_URL: str = "https://qfyjpgctgsmdiyjfviup.supabase.co"
    SUPABASE_KEY: str 
    SUPABASE_PASSWORD: str = "-7cSE_bzsJ@Yqzj"
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:-7cSE_bzsJ@Yqzj@db.qfyjpgctgsmdiyjfviup.supabase.co:5432/postgres"
    
    # Vector Database - Pinecone
    PINECONE_API_KEY: str = "pcsk_5eva3w_6FfdhdZLaGj218QtXrjsUAiVofh7gJhzPYQtDuGZeKkv8soP9BSXXVuMeSbSawS"
    PINECONE_ENVIRONMENT: str = "us-east1-gcp"
    PINECONE_INDEX_NAME: str = "face-embeddings"
    
    # Face Recognition
    FACE_RECOGNITION_MODEL: str = "Facenet512"
    FACE_DETECTION_BACKEND: str = "opencv"
    CONFIDENCE_THRESHOLD: float = 0.6
    
    # File Upload
    MAX_FILE_SIZE: int = 5 * 1024 * 1024  # 5MB
    UPLOAD_DIR: str = "uploads"
    ALLOWED_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".bmp"}
    
    # Development
    DEBUG: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Instância global das configurações
settings = Settings()

# Criar diretório de uploads
if not os.path.exists(settings.UPLOAD_DIR):
    try:
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        print(f"✅ Diretório {settings.UPLOAD_DIR} criado")
    except Exception as e:
        print(f"⚠️ Aviso: Erro ao criar diretório {settings.UPLOAD_DIR}: {e}")