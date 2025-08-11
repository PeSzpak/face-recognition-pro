from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
from app.config import settings
from app.api import auth, persons, recognition, dashboard
from app.core.database import get_database_manager
from app.core.exceptions import (
    FaceRecognitionException,
    PersonNotFoundException,
    InvalidImageException,
    NoFaceDetectedException,
    MultipleFacesException,
    VectorDatabaseException,
    AuthenticationException,
    DatabaseException
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifespan - startup and shutdown events.
    This ensures proper initialization and cleanup.
    """
    # Startup
    logger.info("🚀 Starting Face Recognition Pro...")
    
    try:
        # Initialize database connection
        db_manager = get_database_manager()
        logger.info("✅ Database manager initialized")
        
        # Initialize face recognition service
        from app.services.face_recognition import get_face_recognition_service
        face_service = get_face_recognition_service()
        logger.info("✅ Face recognition service initialized")
        
        # Initialize vector database
        from app.services.vector_database import get_vector_database_service
        vector_db = get_vector_database_service()
        logger.info("✅ Vector database service initialized")
        
        logger.info("🎉 All services initialized successfully")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize services: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down Face Recognition Pro...")
    
    try:
        # Cleanup face recognition service
        face_service.cleanup()
        logger.info("✅ Face recognition service cleaned up")
        
    except Exception as e:
        logger.error(f"❌ Error during cleanup: {e}")
    
    logger.info("👋 Shutdown complete")


# Create FastAPI app with lifespan management
app = FastAPI(
    title="Face Recognition Pro",
    description="Professional Face Recognition System with AI-powered identification",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Enhanced exception handlers
@app.exception_handler(DatabaseException)
async def database_exception_handler(request: Request, exc: DatabaseException):
    logger.error(f"Database error: {exc.detail}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Database operation failed",
            "type": "database_error",
            "timestamp": str(request.headers.get("timestamp", ""))
        }
    )


@app.exception_handler(FaceRecognitionException)
async def face_recognition_exception_handler(request: Request, exc: FaceRecognitionException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "type": "face_recognition_error",
            "timestamp": str(request.headers.get("timestamp", ""))
        }
    )


@app.exception_handler(PersonNotFoundException)
async def person_not_found_exception_handler(request: Request, exc: PersonNotFoundException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "type": "person_not_found",
            "timestamp": str(request.headers.get("timestamp", ""))
        }
    )


@app.exception_handler(InvalidImageException)
async def invalid_image_exception_handler(request: Request, exc: InvalidImageException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "type": "invalid_image",
            "timestamp": str(request.headers.get("timestamp", ""))
        }
    )


@app.exception_handler(NoFaceDetectedException)
async def no_face_detected_exception_handler(request: Request, exc: NoFaceDetectedException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "type": "no_face_detected",
            "timestamp": str(request.headers.get("timestamp", ""))
        }
    )


@app.exception_handler(MultipleFacesException)
async def multiple_faces_exception_handler(request: Request, exc: MultipleFacesException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "type": "multiple_faces",
            "timestamp": str(request.headers.get("timestamp", ""))
        }
    )


@app.exception_handler(VectorDatabaseException)
async def vector_database_exception_handler(request: Request, exc: VectorDatabaseException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "type": "vector_database_error",
            "timestamp": str(request.headers.get("timestamp", ""))
        }
    )


@app.exception_handler(AuthenticationException)
async def authentication_exception_handler(request: Request, exc: AuthenticationException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "type": "authentication_error",
            "timestamp": str(request.headers.get("timestamp", ""))
        },
        headers=exc.headers
    )


# Global exception handler for unexpected errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "type": "internal_error",
            "timestamp": str(request.headers.get("timestamp", ""))
        }
    )


# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(persons.router, prefix="/api/persons", tags=["persons"])
app.include_router(recognition.router, prefix="/api/recognition", tags=["recognition"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])


# Enhanced health check
@app.get("/health")
async def health_check():
    """Comprehensive health check endpoint."""
    try:
        # Check database
        db_manager = get_database_manager()
        db_health = db_manager.health_check()
        
        # Check vector database
        from app.services.vector_database import get_vector_database_service
        vector_db = get_vector_database_service()
        vector_healthy = vector_db.health_check()
        
        # Check face recognition
        from app.services.face_recognition import get_face_recognition_service
        face_service = get_face_recognition_service()
        face_health = face_service.health_check()
        
        # Overall status
        all_healthy = (
            db_health.get("status") == "healthy" and
            vector_healthy and
            face_health.get("status") in ["healthy", "initializing"]
        )
        
        return {
            "status": "healthy" if all_healthy else "degraded",
            "service": "Face Recognition Pro",
            "version": "1.0.0",
            "components": {
                "database": db_health.get("status", "unknown"),
                "vector_database": "healthy" if vector_healthy else "unhealthy",
                "face_recognition": face_health.get("status", "unknown")
            }
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "service": "Face Recognition Pro",
            "version": "1.0.0",
            "error": str(e)
        }


# System information endpoint
@app.get("/info")
async def system_info():
    """Get system information and configuration."""
    try:
        from app.services.face_recognition import get_face_recognition_service
        face_service = get_face_recognition_service()
        model_info = face_service.get_model_info()
        
        from app.services.vector_database import get_vector_database_service
        vector_db = get_vector_database_service()
        vector_stats = vector_db.get_database_stats()
        
        return {
            "service": "Face Recognition Pro",
            "version": "1.0.0",
            "face_recognition": model_info,
            "vector_database": vector_stats,
            "features": {
                "face_detection": True,
                "face_recognition": True,
                "similarity_search": True,
                "batch_processing": True,
                "real_time_recognition": True
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get system info: {e}")
        return {
            "service": "Face Recognition Pro",
            "version": "1.0.0",
            "error": "Failed to retrieve system information"
        }


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Face Recognition Pro API",
        "version": "1.0.0",
        "docs": "/docs" if settings.debug else "disabled",
        "health": "/health",
        "info": "/info",
        "endpoints": {
            "authentication": "/api/auth",
            "persons": "/api/persons",
            "recognition": "/api/recognition",
            "dashboard": "/api/dashboard"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info"
    )