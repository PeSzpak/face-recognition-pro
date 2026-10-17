from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

EMBEDDING_SIZES = {
    "Facenet": 128,
    "Facenet512": 512,
    "ArcFace": 512,
    "SFace": 128,
    "VGG-Face": 4096,
}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://admin:admin123@localhost:5433/face_recognition"

    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    qdrant_collection: str = "face_samples"

    secret_key: str = "dev-only-secret-change-me"
    access_token_ttl_minutes: int = 12 * 60

    admin_email: str = "admin@facerecognition.pro"
    admin_username: str = "admin"
    admin_password: str = "admin123"

    face_model: str = "Facenet512"
    face_detector: str = "retinaface"
    # Cosine similarity. DeepFace's own cutoff for Facenet512 is a cosine distance of 0.30.
    match_threshold: float = 0.70
    face_login_threshold: float = 0.78
    candidate_floor: float = 0.45
    min_face_px: int = 64
    min_sample_quality: float = 0.35
    max_upload_bytes: int = 8 * 1024 * 1024

    media_dir: Path = Path("./media")
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:8080"]
    warmup_models: bool = True

    @property
    def embedding_size(self) -> int:
        return EMBEDDING_SIZES[self.face_model]


settings = Settings()
