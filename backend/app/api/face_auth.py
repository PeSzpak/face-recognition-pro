import time
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Form
from fastapi.responses import JSONResponse
from app.core.database import get_database
from app.core.security import create_access_token
from app.services.face_recognition import get_face_recognition_service
from app.services.vector_database import get_vector_database_service
from app.core.exceptions import (
    InvalidImageException, NoFaceDetectedException, 
    FaceRecognitionException
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/face-login")
async def face_id_login(
    request: Request,
    image_base64: str = Form(..., description="Base64 encoded image"),
    db=Depends(get_database),
    face_service=Depends(get_face_recognition_service),
    vector_db=Depends(get_vector_database_service)
):
    """
    Authenticate user using Face ID.
    Returns JWT token if face is recognized and person has Face Auth permission.
    """
    try:
        start_time = time.time()
        
        # Get client info for logging
        ip_address = request.client.host if request and request.client else None
        user_agent = request.headers.get("user-agent") if request else None
        
        # Process image and extract embedding
        cv2_image, embeddings_data = face_service.process_image_for_recognition(image_base64)
        
        if not embeddings_data:
            processing_time = time.time() - start_time
            
            # Log failed attempt
            db.execute_query(
                """
                INSERT INTO face_auth_logs (person_id, confidence, status, ip_address, user_agent, processing_time, error_message)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (None, 0.0, "no_face", ip_address, user_agent, processing_time, "No face detected in image"),
                fetch=False
            )
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No face detected in the image"
            )
        
        # Get the best quality embedding
        best_embedding = max(embeddings_data, key=lambda x: x['quality_score'])
        query_embedding = best_embedding['embedding']
        
        # Search for similar faces in vector database
        matches = vector_db.search_similar_faces(
            query_embedding, 
            top_k=5, 
            threshold=face_service.similarity_threshold
        )
        
        processing_time = time.time() - start_time
        
        if not matches:
            # No match found
            db.execute_query(
                """
                INSERT INTO face_auth_logs (person_id, confidence, status, ip_address, user_agent, processing_time, error_message)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (None, 0.0, "no_match", ip_address, user_agent, processing_time, "No matching person found"),
                fetch=False
            )
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Face not recognized. No matching person found in database."
            )
        
        # Get the best match
        best_match = matches[0]
        person_id = best_match["person_id"]
        confidence = best_match["similarity"]
        
        # Get person details and check permissions
        person_result = db.execute_query(
            """
            SELECT id, name, email, role, position, department, 
                   can_use_face_auth, active
            FROM persons 
            WHERE id = %s
            """,
            (person_id,)
        )
        
        if not person_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Person not found"
            )
        
        person = person_result[0]
        
        # Check if person is active
        if not person["active"]:
            db.execute_query(
                """
                INSERT INTO face_auth_logs (person_id, confidence, status, ip_address, user_agent, processing_time, error_message)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (person_id, confidence, "denied", ip_address, user_agent, processing_time, "Person account is inactive"),
                fetch=False
            )
            
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive. Contact administrator."
            )
        
        # Check if person has Face Auth permission
        if not person["can_use_face_auth"]:
            db.execute_query(
                """
                INSERT INTO face_auth_logs (person_id, confidence, status, ip_address, user_agent, processing_time, error_message)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (person_id, confidence, "denied", ip_address, user_agent, processing_time, "Face authentication not enabled for this person"),
                fetch=False
            )
            
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Face ID authentication is not enabled for this account. Contact administrator."
            )
        
        # Success! Generate JWT token
        access_token = create_access_token(
            data={
                "sub": person_id,
                "username": person["name"],
                "email": person.get("email"),
                "role": person.get("role", "user"),
                "auth_method": "face_id"
            }
        )
        
        # Log successful authentication
        db.execute_query(
            """
            INSERT INTO face_auth_logs (person_id, confidence, status, ip_address, user_agent, processing_time)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (person_id, confidence, "success", ip_address, user_agent, processing_time),
            fetch=False
        )
        
        logger.info(f"Face ID login successful: {person['name']} (confidence: {confidence:.3f})")
        
        return JSONResponse(
            content={
                "access_token": access_token,
                "token_type": "bearer",
                "auth_method": "face_id",
                "user": {
                    "id": person_id,
                    "username": person["name"],
                    "email": person.get("email"),
                    "full_name": person["name"],
                    "role": person.get("role", "user")
                },
                "confidence": confidence,
                "processing_time": processing_time
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Face ID login failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Face ID authentication failed: {str(e)}"
        )


@router.get("/face-auth-logs")
async def get_face_auth_logs(
    page: int = 1,
    size: int = 50,
    status_filter: Optional[str] = None,
    db=Depends(get_database)
):
    """Get Face ID authentication logs."""
    try:
        conditions = ["1=1"]
        params = []
        
        if status_filter:
            conditions.append("fal.status = %s")
            params.append(status_filter)
        
        where_clause = " AND ".join(conditions)
        offset = (page - 1) * size
        
        query = f"""
            SELECT 
                fal.id,
                fal.person_id,
                fal.confidence,
                fal.status,
                fal.ip_address,
                fal.processing_time,
                fal.error_message,
                fal.created_at,
                p.name as person_name,
                p.role as person_role
            FROM face_auth_logs fal
            LEFT JOIN persons p ON fal.person_id = p.id
            WHERE {where_clause}
            ORDER BY fal.created_at DESC
            LIMIT %s OFFSET %s
        """
        
        params.extend([size, offset])
        result = db.execute_query(query, tuple(params))
        
        # Get total count
        count_query = f"SELECT COUNT(*) as total FROM face_auth_logs fal WHERE {where_clause}"
        count_result = db.execute_query(count_query, tuple(params[:len(params)-2]))
        total = count_result[0]['total'] if count_result else 0
        
        return {
            "logs": result or [],
            "total": total,
            "page": page,
            "size": size
        }
        
    except Exception as e:
        logger.error(f"Failed to get face auth logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve face authentication logs"
        )


@router.get("/face-auth-stats")
async def get_face_auth_stats(
    db=Depends(get_database)
):
    """Get Face ID authentication statistics."""
    try:
        # Get statistics
        stats_query = """
            SELECT 
                COUNT(*) as total_attempts,
                COUNT(*) FILTER (WHERE status = 'success') as successful_attempts,
                COUNT(*) FILTER (WHERE status = 'denied') as denied_attempts,
                COUNT(*) FILTER (WHERE status = 'no_face') as no_face_attempts,
                COUNT(*) FILTER (WHERE status = 'no_match') as no_match_attempts,
                AVG(confidence) FILTER (WHERE status = 'success') as avg_confidence,
                AVG(processing_time) as avg_processing_time,
                COUNT(DISTINCT person_id) FILTER (WHERE status = 'success') as unique_users
            FROM face_auth_logs
            WHERE created_at > NOW() - INTERVAL '30 days'
        """
        
        result = db.execute_query(stats_query)
        
        if result:
            stats = result[0]
            total = stats['total_attempts'] or 0
            success = stats['successful_attempts'] or 0
            
            return {
                "total_attempts": total,
                "successful_attempts": success,
                "success_rate": (success / total * 100) if total > 0 else 0,
                "denied_attempts": stats['denied_attempts'] or 0,
                "no_face_attempts": stats['no_face_attempts'] or 0,
                "no_match_attempts": stats['no_match_attempts'] or 0,
                "average_confidence": float(stats['avg_confidence'] or 0),
                "average_processing_time": float(stats['avg_processing_time'] or 0),
                "unique_users": stats['unique_users'] or 0
            }
        
        return {
            "total_attempts": 0,
            "successful_attempts": 0,
            "success_rate": 0,
            "denied_attempts": 0,
            "no_face_attempts": 0,
            "no_match_attempts": 0,
            "average_confidence": 0,
            "average_processing_time": 0,
            "unique_users": 0
        }
        
    except Exception as e:
        logger.error(f"Failed to get face auth stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve face authentication statistics"
        )
