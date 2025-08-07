from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # Core Application Settings
    app_name: str = "Face Recognition Pro"
    version: str = "1.0.0"
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Security - JWT Configuration
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Database Configuration - Supabase
    supabase_url: str
    supabase_key: str  # Public key para operações client-side
    supabase_password: str  # Senha do banco (será usada para service key)
    database_url: str  # URL completa do PostgreSQL
    
    # Vai gerar automaticamente a service key baseada na configuração
    @property
    def supabase_service_key(self) -> str:
        """
        Em produção, isso deveria vir do dashboard do Supabase.
        Por enquanto, uso a mesma key - mas você deve gerar uma service key real!
        """
        return self.supabase_key
    
    # Vector Database - Pinecone
    pinecone_api_key: str
    pinecone_environment: str
    pinecone_index_name: str = "face-embeddings"
    
    # Face Recognition - DeepFace Configuration
    face_recognition_model: str = "Facenet512"
    face_detection_backend: str = "opencv"
    confidence_threshold: float = 0.6  
    
    # Upload & Storage Settings
    max_file_size: int = 10485760  # 10MB em bytes
    upload_path: str = "./uploads"
    allowed_extensions: List[str] = ["jpg", "jpeg", "png", "webp", "bmp"]
    
    # Performance Settings
    enable_model_caching: bool = True
    max_concurrent_recognitions: int = 5
    vector_batch_size: int = 100
    
    # Logging
    log_level: str = "INFO"
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        # Permite que campos sejam sobrescritos por variáveis de ambiente


def create_directories():
    """
    Cria os diretórios necessários para a aplicação.
    Bem mais robusto que a versão anterior.
    """
    directories = [
        "./uploads",
        "./logs", 
        "./temp",
        "./models"  # Para o cache de modelos DeepFace
    ]
    
    for directory in directories:
        if not os.path.exists(directory):
            os.makedirs(directory, exist_ok=True)
            print(f"✅ Diretório criado: {directory}")


def validate_environment():
    """
    Valida se todas as variáveis necessárias estão configuradas.
    Evita surpresas durante a execução.
    """
    required_vars = [
        "SECRET_KEY",
        "SUPABASE_URL", 
        "SUPABASE_KEY",
        "PINECONE_API_KEY",
        "PINECONE_ENVIRONMENT"
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        raise ValueError(f"❌ Variáveis de ambiente obrigatórias faltando: {', '.join(missing_vars)}")
    
    print("✅ Todas as variáveis de ambiente estão configuradas")


# Inicialização
try:
    validate_environment()
    settings = Settings()
    create_directories()
    print(f" Configuração carregada: {settings.app_name} v{settings.version}")
except Exception as e:
    print(f" Erro na configuração: {e}")
    raise