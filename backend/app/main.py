from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .config import settings
import logging
import os

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = FastAPI(
    title="Face Recognition Pro API",
    description="Sistema avançado de reconhecimento facial com Pinecone e Supabase",
    version="1.0.0",
    debug=settings.DEBUG
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Garantir diretório uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# Static files para uploads
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Incluir routers
try:
    from .api import system, auth, persons, recognition, dashboard
    app.include_router(system.router)
    app.include_router(auth.router)
    app.include_router(persons.router)
    app.include_router(recognition.router)
    app.include_router(dashboard.router)
except ImportError as e:
    logging.warning(f"Alguns routers não puderam ser importados: {e}")
    # Importar apenas os disponíveis
    try:
        from .api import system
        app.include_router(system.router)
    except ImportError:
        pass

@app.get("/")
async def root():
    return {
        "message": "Face Recognition Pro API",
        "version": "1.0.0",
        "status": "running",
        "pinecone_configured": bool(settings.PINECONE_API_KEY),
        "supabase_configured": bool(hasattr(settings, 'SUPABASE_KEY')),
        "docs": "/docs",
        "health": "/api/system/health"
    }

@app.on_event("startup")
async def startup_event():
    """Executar na inicialização"""
    logging.info("🚀 Iniciando Face Recognition Pro API...")
    logging.info(f"📍 Pinecone Environment: {settings.PINECONE_ENVIRONMENT}")
    logging.info(f"📁 Upload Directory: {settings.UPLOAD_DIR}")
    logging.info(f"🐛 Debug Mode: {settings.DEBUG}")
    logging.info(f"🔑 Pinecone API Key: {'✅ Configurada' if settings.PINECONE_API_KEY else '❌ Não configurada'}")
    
    try:
        logging.info(f"🗄️ Supabase: {'✅ Configurado' if settings.SUPABASE_KEY else '❌ Não configurado'}")
    except:
        logging.info("🗄️ Supabase: ❌ Não configurado")

@app.on_event("shutdown")
async def shutdown_event():
    """Executar no encerramento"""
    logging.info("🛑 Encerrando Face Recognition Pro API...")