from pydantic_settings import BaseSettings
from typing import List, Optional
import os

class Settings(BaseSettings):
    # Database (Supabase)
    supabase_url: str = "http://localhost:8000"
    supabase_key: str = "mock_key"
    supabase_service_key: str = "mock_service_key"
    supabase_password: Optional[str] = None  # ADICIONAR ESTE CAMPO
    database_url: Optional[str] = None       # ADICIONAR ESTE CAMPO
    
    # Vector Database (Pinecone)
    pinecone_api_key: str = "mock_pinecone_key"
    pinecone_environment: str = "us-east1-gcp"
    pinecone_index_name: str = "face-recognition-embeddings"
    
    # Security
    secret_key: str = "face-recognition-pro-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Face Recognition
    face_recognition_model: str = "Facenet512"
    face_detection_backend: str = "opencv"
    similarity_threshold: float = 0.6
    confidence_threshold: float = 0.6        # ADICIONAR ESTE CAMPO
    
    # Upload
    max_file_size: int = 10485760  # 10MB
    allowed_extensions: List[str] = ["jpg", "jpeg", "png", "webp", "bmp"]
    upload_path: str = "./uploads"
    
    # API
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8000
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        # PERMITIR CAMPOS EXTRAS
        extra = "allow"  # Importante: permite campos extras

# Instância global
settings = Settings()

def ensure_upload_directory():
    """Garantir que o diretório de uploads existe"""
    try:
        if not os.path.exists(settings.upload_path):
            os.makedirs(settings.upload_path, exist_ok=True)
            print(f"📁 Diretório criado: {settings.upload_path}")
    except Exception as e:
        print(f"⚠️ Aviso: {e}")

# Criar diretório na importação (de forma segura)
ensure_upload_directory()