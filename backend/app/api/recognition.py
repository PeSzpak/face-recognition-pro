import time
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Form
from fastapi.responses import JSONResponse
from app.core.database import get_database
from app.core.security import get_current_user
from app.services.face_recognition import get_face_recognition_service
from app.services.vector_database import get_vector_database_service
from app.schemas.recognition import (
    RecognitionRequest, RecognitionResult, RecognitionLogResponse, 
    RecognitionStatsResponse
)
from app.models.recognition_log import RecognitionLogCreate
from app.core.exceptions import (
    InvalidImageException, NoFaceDetectedException, 
    FaceRecognitionException
)
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/identify", response_model=RecognitionResult)
async def identify_face(
    image_base64: str = Form(..., description="Base64 encoded image"),
    threshold: Optional[float] = Form(None, description="Custom similarity threshold"),
    current_user=Depends(get_current_user),
    db=Depends(get_database),
    face_service=Depends(get_face_recognition_service),
    vector_db=Depends(get_vector_database_service)
):
    """Identify a person from an uploaded image."""
    try:
        start_time = time.time()
        
        # Process image and extract embeddings
        cv2_image, embeddings_data = face_service.process_image_for_recognition(image_base64)
        
        if not embeddings_data:
            processing_time = time.time() - start_time
            
            # Log failed recognition
            db.execute_query(
                """
                INSERT INTO recognition_logs (person_id, confidence, status, processing_time)
                VALUES (%s, %s, %s, %s)
                """,
                (None, 0.0, "no_face", processing_time),
                fetch=False
            )
            
            return RecognitionResult(
                person_id=None,
                person_name=None,
                confidence=0.0,
                status="no_face",
                processing_time=processing_time,
                message="No face detected in the image"
            )
        
        # Get the best quality embedding
        best_embedding = max(embeddings_data, key=lambda x: x['quality_score'])
        query_embedding = best_embedding['embedding']
        
        # Search for similar faces in vector database
        similarity_threshold = threshold or face_service.similarity_threshold
        matches = vector_db.search_similar_faces(
            query_embedding, 
            top_k=5, 
            threshold=similarity_threshold
        )
        
        processing_time = time.time() - start_time
        
        if matches:
            # Get the best match
            best_match = matches[0]
            person_id = best_match["person_id"]
            confidence = best_match["similarity"]
            
            # Get person details from database
            person_result = db.execute_query(
                "SELECT id, name FROM persons WHERE id = %s",
                (person_id,)
            )
            person_name = person_result[0]["name"] if person_result else "Unknown"
            
            # Log successful recognition
            db.execute_query(
                """
                INSERT INTO recognition_logs (person_id, confidence, status, processing_time)
                VALUES (%s, %s, %s, %s)
                """,
                (person_id, confidence, "success", processing_time),
                fetch=False
            )
            
            logger.info(f"Face identified: {person_name} (confidence: {confidence:.3f})")
            
            return RecognitionResult(
                person_id=person_id,
                person_name=person_name,
                confidence=confidence,
                status="success",
                processing_time=processing_time,
                message=f"Person identified with {confidence:.1%} confidence"
            )
        else:
            # No match found
            db.execute_query(
                """
                INSERT INTO recognition_logs (person_id, confidence, status, processing_time)
                VALUES (%s, %s, %s, %s)
                """,
                (None, 0.0, "no_match", processing_time),
                fetch=False
            )
            
            return RecognitionResult(
                person_id=None,
                person_name=None,
                confidence=0.0,
                status="no_match",
                processing_time=processing_time,
                message="No matching person found in database"
            )
            
    except (InvalidImageException, NoFaceDetectedException, FaceRecognitionException):
        raise
    except Exception as e:
        logger.error(f"Face identification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Face identification failed"
        )


@router.get("/logs", response_model=List[RecognitionLogResponse])
async def get_recognition_logs(
    page: int = 1,
    size: int = 50,
    status_filter: Optional[str] = None,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Get recognition logs with pagination."""
    try:
        # Build query
        conditions = ["1=1"]
        params = []
        
        if status_filter:
            conditions.append("rl.status = %s")
            params.append(status_filter)
        
        where_clause = " AND ".join(conditions)
        
        # Apply pagination
        offset = (page - 1) * size
        
        query = f"""
            SELECT 
                rl.id, 
                rl.person_id, 
                rl.confidence, 
                rl.status, 
                rl.processing_time, 
                rl.created_at,
                p.name as person_name
            FROM recognition_logs rl
            LEFT JOIN persons p ON rl.person_id = p.id
            WHERE {where_clause}
            ORDER BY rl.created_at DESC
            LIMIT %s OFFSET %s
        """
        
        params.extend([size, offset])
        result = db.execute_query(query, tuple(params))
        
        logs = []
        if result:
            for log_data in result:
                logs.append(RecognitionLogResponse(**log_data))
        
        return logs
        
    except Exception as e:
        logger.error(f"Failed to get recognition logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve recognition logs"
        )


@router.get("/stats", response_model=RecognitionStatsResponse)
async def get_recognition_stats(
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Get recognition statistics."""
    try:
        # Get all recognition logs
        all_logs = db.execute_query("SELECT * FROM recognition_logs ORDER BY created_at DESC")
        
        if not all_logs:
            return RecognitionStatsResponse(
                total_recognitions=0,
                successful_recognitions=0,
                success_rate=0.0,
                average_confidence=0.0,
                average_processing_time=0.0,
                recognitions_today=0,
                recognitions_this_week=0,
                recognitions_this_month=0
            )
        
        logs_data = all_logs
        total_recognitions = len(logs_data)
        successful_logs = [log for log in logs_data if log["status"] == "success"]
        successful_recognitions = len(successful_logs)
        
        # Calculate statistics
        success_rate = (successful_recognitions / total_recognitions * 100) if total_recognitions > 0 else 0
        average_confidence = sum(log["confidence"] for log in successful_logs) / len(successful_logs) if successful_logs else 0
        average_processing_time = sum(log["processing_time"] for log in logs_data) / len(logs_data)
        
        # Time-based counts (simplified - would need proper date filtering in production)
        from datetime import datetime, timedelta
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        recognitions_today = len([log for log in logs_data 
                                if log["created_at"].date() == today])
        recognitions_this_week = len([log for log in logs_data 
                                    if log["created_at"].date() >= week_ago])
        recognitions_this_month = len([log for log in logs_data 
                                     if log["created_at"].date() >= month_ago])
        
        return RecognitionStatsResponse(
            total_recognitions=total_recognitions,
            successful_recognitions=successful_recognitions,
            success_rate=success_rate,
            average_confidence=average_confidence,
            average_processing_time=average_processing_time,
            recognitions_today=recognitions_today,
            recognitions_this_week=recognitions_this_week,
            recognitions_this_month=recognitions_this_month
        )
        
    except Exception as e:
        logger.error(f"Failed to get recognition stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve recognition statistics"
        )