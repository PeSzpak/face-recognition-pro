from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
import sys

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Criar aplicação FastAPI
app = FastAPI(
    title="Face Recognition Pro",
    description="Sistema Profissional de Reconhecimento Facial com IA",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Criar diretório uploads
def create_uploads_dir():
    upload_dir = "./uploads"
    try:
        if not os.path.exists(upload_dir):
            os.makedirs(upload_dir, exist_ok=True)
            logger.info(f"📁 Diretório uploads criado: {upload_dir}")
        else:
            logger.info(f"📁 Diretório uploads existe: {upload_dir}")
    except Exception as e:
        logger.warning(f"⚠️ Erro ao criar uploads: {e}")

create_uploads_dir()

# ===== ROTAS BÁSICAS =====
@app.get("/")
async def root():
    """Endpoint raiz da API"""
    return {
        "message": "Face Recognition Pro API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/health",
        "endpoints": {
            "system": "/api/system/health",
            "dashboard": "/api/dashboard/stats",
            "persons": "/api/persons/",
            "recognition": "/api/recognition/stats"
        }
    }

@app.get("/health")
async def health_check():
    """Health check básico"""
    return {
        "status": "healthy",
        "service": "Face Recognition Pro",
        "version": "1.0.0",
        "python_version": sys.version,
        "directory": os.getcwd()
    }

# ===== INCLUIR ROUTERS (APENAS UMA VEZ) =====
try:
    from app.api import auth, persons, recognition, dashboard, system
    
    app.include_router(auth.router)
    app.include_router(persons.router)
    app.include_router(recognition.router)
    app.include_router(dashboard.router)
    app.include_router(system.router)
    
    logger.info("✅ Todos os routers carregados com sucesso")
    
except ImportError as e:
    logger.warning(f"⚠️ Erro ao importar routers: {e}")
    logger.info("🔄 Criando rotas básicas de fallback...")
    
    # ROTAS FALLBACK SE OS MÓDULOS NÃO EXISTIREM
    @app.get("/api/system/health")
    async def system_health_fallback():
        return {
            "status": "healthy",
            "message": "Sistema funcionando (modo fallback)",
            "components": {
                "api": "healthy",
                "face_recognition": "not_loaded",
                "vector_database": "not_loaded",
                "database": "not_loaded"
            }
        }
    
    @app.get("/api/dashboard/stats")
    async def dashboard_stats_fallback():
        return {
            "total_persons": 0,
            "active_persons": 0,
            "total_recognitions": 0,
            "recognitions_today": 0,
            "accuracy": 0.0,
            "status": "fallback_mode"
        }
    
    @app.get("/api/persons/")
    async def get_persons_fallback():
        return []
    
    @app.get("/api/recognition/stats")
    async def recognition_stats_fallback():
        return {
            "total_recognitions": 0,
            "successful_recognitions": 0,
            "accuracy": 0.0,
            "status": "fallback_mode"
        }

# ===== EVENT HANDLERS =====
@app.on_event("startup")
async def startup_event():
    """Executar na inicialização"""
    logger.info("🚀 Face Recognition Pro API iniciada!")
    logger.info(f"📍 Ambiente: {'Desenvolvimento' if True else 'Produção'}")
    logger.info(f"📁 Diretório: {os.getcwd()}")
    logger.info(f"🐍 Python: {sys.version.split()[0]}")
    logger.info("✅ Sistema pronto para uso!")

@app.on_event("shutdown")
async def shutdown_event():
    """Executar no encerramento"""
    logger.info("🛑 Face Recognition Pro API encerrada!")

# Para execução direta
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)