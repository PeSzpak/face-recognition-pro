from fastapi import Depends, HTTPException, status
from app.core.security import get_current_user
from app.core.database import get_database, get_database_service, get_database_manager
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
        # Check database connection using the new database manager
        db_manager = get_database_manager()
        db_health = db_manager.health_check()
        
        if db_health.get("status") != "healthy":
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database is not available"
            )
        
        # Check vector database
        vector_db = get_vector_database_service()
        if not vector_db.health_check():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Vector database is not available"
            )
        
        # Check face recognition service
        face_service = get_face_recognition_service()
        face_health = face_service.health_check()
        
        if face_health.get("status") not in ["healthy", "initializing"]:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Face recognition service is not available"
            )
        
        return {
            "database": db_health,
            "vector_database": "healthy",
            "face_recognition": face_health,
            "system_status": "healthy"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"System health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"System health check failed: {str(e)}"
        )


async def get_enhanced_database_stats():
    """Get comprehensive database statistics."""
    try:
        db_service = get_database_service()
        stats = await db_service.get_dashboard_stats()
        return stats
    except Exception as e:
        logger.error(f"Failed to get database stats: {e}")
        return {
            "error": "Failed to retrieve database statistics",
            "details": str(e)
        }


async def validate_person_access(
    person_id: str,
    current_user=Depends(get_current_user),
    db_service=Depends(get_database_service)
):
    """Validate that user has access to person data."""
    try:
        person = await db_service.get_person_by_id(person_id)
        if not person:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Person {person_id} not found"
            )
        
        # For now, all authenticated users can access all persons
        # In production, implement proper access control
        return person
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to validate person access: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate access"
        )


# Enhanced dependency collections for different use cases
CommonDeps = {
    "current_user": Depends(get_current_user),
    "db": Depends(get_database),  # Legacy compatibility
    "db_service": Depends(get_database_service),  # New enhanced service
    "face_service": Depends(get_face_recognition_service),
    "vector_db": Depends(get_vector_database_service),
    "image_processor": Depends(get_image_processor),
    "auth_service": Depends(get_auth_service)
}

# Admin dependencies
AdminDeps = {
    **CommonDeps,
    "admin_user": Depends(verify_admin_user)
}

# System monitoring dependencies
MonitoringDeps = {
    **CommonDeps,
    "system_health": Depends(verify_system_health),
    "db_stats": Depends(get_enhanced_database_stats)
}