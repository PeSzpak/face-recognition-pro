from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from app.config import settings
from app.api import auth, persons, recognition, dashboard
from app.core.exceptions import (
    FaceRecognitionException,
    PersonNotFoundException,
    InvalidImageException,
    NoFaceDetectedException,
    MultipleFacesException,
    VectorDatabaseException,
    AuthenticationException
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Face Recognition Pro",
    description="Professional Face Recognition System with AI-powered identification",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
@app.exception_handler(FaceRecognitionException)
async def face_recognition_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "type": "face_recognition_error"}
    )

@app.exception_handler(PersonNotFoundException)
async def person_not_found_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "type": "person_not_found"}
    )

@app.exception_handler(InvalidImageException)
async def invalid_image_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "type": "invalid_image"}
    )

@app.exception_handler(NoFaceDetectedException)
async def no_face_detected_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "type": "no_face_detected"}
    )

@app.exception_handler(MultipleFacesException)
async def multiple_faces_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "type": "multiple_faces"}
    )

@app.exception_handler(VectorDatabaseException)
async def vector_database_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "type": "vector_database_error"}
    )

@app.exception_handler(AuthenticationException)
async def authentication_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "type": "authentication_error"},
        headers=exc.headers
    )

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(persons.router, prefix="/api/persons", tags=["persons"])
app.include_router(recognition.router, prefix="/api/recognition", tags=["recognition"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])

# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Face Recognition Pro",
        "version": "1.0.0"
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Face Recognition Pro API",
        "version": "1.0.0",
        "docs": "/docs" if settings.debug else "disabled",
        "health": "/health"
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