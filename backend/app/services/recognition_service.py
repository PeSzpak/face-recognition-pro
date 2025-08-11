import logging
import time
from typing import Dict, Optional, List
from datetime import datetime, timedelta
from app.core.database import get_database
from app.services.face_recognition import get_face_recognition_service
from app.services.vector_database import get_vector_database_service
from app.models.recognition_log import RecognitionLogCreate
from app.core.exceptions import FaceRecognitionException, NoFaceDetectedException
from app.config import settings

logger = logging.getLogger(__name__)


class RecognitionService:
    def __init__(self):
        self.db = get_database()
        self.face_recognition = get_face_recognition_service()
        self.vector_db = get_vector_database_service()
        self.confidence_threshold = settings.confidence_threshold
    
    async def identify_person(self, base64_image: str, threshold: Optional[float] = None) -> Dict:
        """Identify person from image."""
        start_time = time.time()
        
        try:
            # Use custom threshold or default
            if threshold is None:
                threshold = self.confidence_threshold
            
            # Process image and extract embeddings
            cv2_image, embeddings_data = self.face_recognition.process_image_for_recognition(base64_image)
            
            if not embeddings_data:
                raise NoFaceDetectedException()
            
            # Use the best quality embedding
            best_embedding = max(embeddings_data, key=lambda x: x.get('quality_score', 0))
            query_embedding = best_embedding['embedding']
            
            # Search in vector database
            matches = self.vector_db.search_similar_faces(query_embedding, top_k=5, threshold=threshold)
            
            processing_time = time.time() - start_time
            
            if matches:
                # Get best match
                best_match = matches[0]
                person_id = best_match['person_id']
                confidence = best_match['similarity']
                
                # Get person details
                person_result = self.db.table("persons").select("*").eq("id", person_id).execute()
                person_name = person_result.data[0]['name'] if person_result.data else "Unknown"
                
                # Log successful recognition
                await self._log_recognition(
                    person_id=person_id,
                    confidence=confidence,
                    status="success",
                    processing_time=processing_time
                )
                
                return {
                    "person_id": person_id,
                    "person_name": person_name,
                    "confidence": confidence,
                    "status": "success",
                    "processing_time": processing_time,
                    "recognized": True,
                    "matches": len(matches)
                }
            else:
                # No match found
                await self._log_recognition(
                    person_id=None,
                    confidence=0.0,
                    status="no_match",
                    processing_time=processing_time
                )
                
                return {
                    "person_id": None,
                    "person_name": None,
                    "confidence": 0.0,
                    "status": "no_match",
                    "processing_time": processing_time,
                    "recognized": False,
                    "message": "No matching person found"
                }
                
        except NoFaceDetectedException:
            processing_time = time.time() - start_time
            await self._log_recognition(
                person_id=None,
                confidence=0.0,
                status="no_face",
                processing_time=processing_time
            )
            
            return {
                "person_id": None,
                "person_name": None,
                "confidence": 0.0,
                "status": "no_face",
                "processing_time": processing_time,
                "recognized": False,
                "message": "No face detected in image"
            }
            
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"Recognition failed: {e}")
            
            await self._log_recognition(
                person_id=None,
                confidence=0.0,
                status="error",
                processing_time=processing_time
            )
            
            raise FaceRecognitionException(f"Recognition failed: {str(e)}")
    
    async def verify_person(self, person_id: str, base64_image: str, threshold: Optional[float] = None) -> Dict:
        """Verify if image matches specific person."""
        start_time = time.time()
        
        try:
            # Check if person exists
            person_result = self.db.table("persons").select("*").eq("id", person_id).execute()
            if not person_result.data:
                raise FaceRecognitionException(f"Person {person_id} not found")
            
            person = person_result.data[0]
            
            # Use custom threshold or default
            if threshold is None:
                threshold = self.confidence_threshold
            
            # Process image and extract embeddings
            cv2_image, embeddings_data = self.face_recognition.process_image_for_recognition(base64_image)
            
            if not embeddings_data:
                raise NoFaceDetectedException()
            
            # Use the best quality embedding
            best_embedding = max(embeddings_data, key=lambda x: x.get('quality_score', 0))
            query_embedding = best_embedding['embedding']
            
            # Search for this specific person
            matches = self.vector_db.search_similar_faces(query_embedding, top_k=10, threshold=0.0)
            
            # Filter matches for this person only
            person_matches = [match for match in matches if match['person_id'] == person_id]
            
            processing_time = time.time() - start_time
            
            if person_matches:
                best_match = max(person_matches, key=lambda x: x['similarity'])
                confidence = best_match['similarity']
                verified = confidence >= threshold
                
                status = "verified" if verified else "not_verified"
                
                await self._log_recognition(
                    person_id=person_id,
                    confidence=confidence,
                    status=status,
                    processing_time=processing_time
                )
                
                return {
                    "person_id": person_id,
                    "person_name": person['name'],
                    "confidence": confidence,
                    "threshold": threshold,
                    "verified": verified,
                    "status": status,
                    "processing_time": processing_time
                }
            else:
                await self._log_recognition(
                    person_id=person_id,
                    confidence=0.0,
                    status="not_verified",
                    processing_time=processing_time
                )
                
                return {
                    "person_id": person_id,
                    "person_name": person['name'],
                    "confidence": 0.0,
                    "threshold": threshold,
                    "verified": False,
                    "status": "not_verified",
                    "processing_time": processing_time,
                    "message": "Person verification failed"
                }
                
        except (NoFaceDetectedException, FaceRecognitionException):
            raise
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"Verification failed: {e}")
            
            await self._log_recognition(
                person_id=person_id,
                confidence=0.0,
                status="error",
                processing_time=processing_time
            )
            
            raise FaceRecognitionException(f"Verification failed: {str(e)}")
    
    async def get_recognition_logs(self, page: int = 1, size: int = 20, 
                                 person_id: Optional[str] = None,
                                 status: Optional[str] = None) -> Dict:
        """Get recognition logs with pagination."""
        try:
            offset = (page - 1) * size
            
            # Build query
            query = self.db.table("recognition_logs").select(
                "*, persons(name)"
            )
            
            # Add filters
            if person_id:
                query = query.eq("person_id", person_id)
            if status:
                query = query.eq("status", status)
            
            # Execute query
            result = query.order("created_at", desc=True).range(offset, offset + size - 1).execute()
            
            # Get total count
            count_query = self.db.table("recognition_logs").select("id", count="exact")
            if person_id:
                count_query = count_query.eq("person_id", person_id)
            if status:
                count_query = count_query.eq("status", status)
            count_result = count_query.execute()
            
            total = count_result.count
            has_next = (offset + size) < total
            
            # Process results
            logs = []
            for log in result.data:
                log_data = {
                    "id": log["id"],
                    "person_id": log["person_id"],
                    "person_name": log["persons"]["name"] if log["persons"] else None,
                    "confidence": log["confidence"],
                    "status": log["status"],
                    "processing_time": log["processing_time"],
                    "created_at": log["created_at"]
                }
                logs.append(log_data)
            
            return {
                "logs": logs,
                "total": total,
                "page": page,
                "size": size,
                "has_next": has_next
            }
            
        except Exception as e:
            logger.error(f"Failed to get recognition logs: {e}")
            raise FaceRecognitionException("Failed to retrieve recognition logs")
    
    async def get_recognition_stats(self) -> Dict:
        """Get recognition statistics."""
        try:
            # Total recognitions
            total_result = self.db.table("recognition_logs").select("id", count="exact").execute()
            total_recognitions = total_result.count
            
            # Successful recognitions
            success_result = self.db.table("recognition_logs").select("id", count="exact").eq("status", "success").execute()
            successful_recognitions = success_result.count
            
            # Calculate success rate
            success_rate = (successful_recognitions / total_recognitions * 100) if total_recognitions > 0 else 0
            
            # Average confidence and processing time
            stats_query = self.db.table("recognition_logs").select("confidence, processing_time").execute()
            
            if stats_query.data:
                confidences = [log["confidence"] for log in stats_query.data if log["confidence"] is not None]
                processing_times = [log["processing_time"] for log in stats_query.data if log["processing_time"] is not None]
                
                avg_confidence = sum(confidences) / len(confidences) if confidences else 0
                avg_processing_time = sum(processing_times) / len(processing_times) if processing_times else 0
            else:
                avg_confidence = 0
                avg_processing_time = 0
            
            # Recognitions today
            today = datetime.utcnow().date()
            today_result = self.db.table("recognition_logs").select("id", count="exact").gte("created_at", today.isoformat()).execute()
            recognitions_today = today_result.count
            
            # Recognitions this week
            week_ago = datetime.utcnow() - timedelta(days=7)
            week_result = self.db.table("recognition_logs").select("id", count="exact").gte("created_at", week_ago.isoformat()).execute()
            recognitions_this_week = week_result.count
            
            # Recognitions this month
            month_ago = datetime.utcnow() - timedelta(days=30)
            month_result = self.db.table("recognition_logs").select("id", count="exact").gte("created_at", month_ago.isoformat()).execute()
            recognitions_this_month = month_result.count
            
            return {
                "total_recognitions": total_recognitions,
                "successful_recognitions": successful_recognitions,
                "success_rate": round(success_rate, 2),
                "average_confidence": round(avg_confidence, 4),
                "average_processing_time": round(avg_processing_time, 4),
                "recognitions_today": recognitions_today,
                "recognitions_this_week": recognitions_this_week,
                "recognitions_this_month": recognitions_this_month
            }
            
        except Exception as e:
            logger.error(f"Failed to get recognition stats: {e}")
            raise FaceRecognitionException("Failed to retrieve recognition statistics")
    
    async def _log_recognition(self, person_id: Optional[str], confidence: float, 
                             status: str, processing_time: float, 
                             image_path: Optional[str] = None) -> None:
        """Log recognition attempt."""
        try:
            log_data = RecognitionLogCreate(
                person_id=person_id,
                confidence=confidence,
                status=status,
                processing_time=processing_time,
                image_path=image_path
            )
            
            self.db.table("recognition_logs").insert(log_data.dict()).execute()
            
        except Exception as e:
            logger.error(f"Failed to log recognition: {e}")
            # Don't raise exception here as it's just logging


# Global recognition service instance
recognition_service = RecognitionService()


def get_recognition_service() -> RecognitionService:
    """Dependency to get recognition service."""
    return recognition_service