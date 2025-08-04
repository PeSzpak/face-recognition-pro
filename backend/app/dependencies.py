from fastapi import Depends, HTTPException, status
from app.core.security import get_current_user
from app.core.database import get_database
from app.services.face_recognition import get_face_recognition_service
from app.services.vector_database import get_vector_database_service
from app.services.image_processor import get_image_processor
from app.services.auth_service import get_auth_service
import logging

logger = logging.getLogger(__name__)


async def get_current_active_user(current_user=Depends(get_current_user)):
    """Get current active user."""
    # Additional check if user is active (could query database if needed)
    return current_user


async def verify_admin_user(current_user=Depends(get_current_user)):
    """Verify user has admin privileges."""
    # For now, all authenticated users have admin privileges
    # In production, you'd check user roles/permissions
    return current_user


async def verify_system_health():
    """Verify all system components are healthy."""
    try:
        # Check database connection
        db = get_database()
        db.table("users").select("id").limit(1).execute()
        
        # Check vector database
        vector_db = get_vector_database_service()
        if not vector_db.health_check():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Vector database is not available"
            )
        
        # Check face recognition service
        face_service = get_face_recognition_service()
        model_info = face_service.get_model_info()
        
        return {
            "database": "healthy",
            "vector_database": "healthy",
            "face_recognition": "healthy",
            "model": model_info["model_name"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"System health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="System health check failed"
        )


# Common dependencies
CommonDeps = {
    "current_user": Depends(get_current_user),
    "db": Depends(get_database),
    "face_service": Depends(get_face_recognition_service),
    "vector_db": Depends(get_vector_database_service),
    "image_processor": Depends(get_image_processor),
    "auth_service": Depends(get_auth_service)
}