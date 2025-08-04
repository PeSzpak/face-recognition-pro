import os

class Config:
    DATABASE_URL = os.getenv("DATABASE_URL", "your_default_database_url")
    SUPABASE_URL = os.getenv("SUPABASE_URL", "your_default_supabase_url")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY", "your_default_supabase_key")
    JWT_SECRET = os.getenv("JWT_SECRET", "your_default_jwt_secret")
    JWT_EXPIRATION = os.getenv("JWT_EXPIRATION", "1h")
    IMAGE_UPLOAD_PATH = os.getenv("IMAGE_UPLOAD_PATH", "./uploads")
    PINECONE_API_KEY = os.getenv("PINECONE_API_KEY", "your_default_pinecone_api_key")
    PINECONE_ENVIRONMENT = os.getenv("PINECONE_ENVIRONMENT", "us-west1-gcp")