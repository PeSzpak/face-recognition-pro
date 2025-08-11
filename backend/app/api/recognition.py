import time
import uuid
from typing import Optional, List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Form
from fastapi.responses import JSONResponse, StreamingResponse
from app.core.database import get_database_service, DatabaseService
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
    db_service: DatabaseService = Depends(get_database_service),
    face_service=Depends(get_face_recognition_service),
    vector_db=Depends(get_vector_database_service)
):
    """Identify a person from an uploaded image using Pinecone for similarity search."""
    try:
        start_time = time.time()
        
        # Process image and extract embeddings
        cv2_image, embeddings_data = await face_service.process_image_for_recognition(image_base64)
        
        if not embeddings_data:
            processing_time = time.time() - start_time
            
            # Log failed recognition using Supabase
            log_data = {
                "id": str(uuid.uuid4()),
                "person_id": None,
                "person_name": None,
                "confidence": 0.0,
                "status": "no_face",
                "processing_time": processing_time,
                "created_by": current_user["sub"],
                "created_at": "now()"
            }
            await db_service.create_recognition_log(log_data)
            
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
        
        # Search for similar faces in Pinecone
        similarity_threshold = threshold or face_service.similarity_threshold
        matches = await vector_db.search_similar_faces(
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
            
            # Get person details from Supabase
            person = await db_service.get_person_by_id(person_id)
            person_name = person["name"] if person else "Unknown"
            
            # Log successful recognition using Supabase
            log_data = {
                "id": str(uuid.uuid4()),
                "person_id": person_id,
                "person_name": person_name,
                "confidence": confidence,
                "status": "success",
                "processing_time": processing_time,
                "created_by": current_user["sub"],
                "created_at": "now()"
            }
            await db_service.create_recognition_log(log_data)
            
            logger.info(f"Face identified: {person_name} (confidence: {confidence:.3f})")
            
            return RecognitionResult(
                person_id=person_id,
                person_name=person_name,
                confidence=confidence,
                status="success",
                processing_time=processing_time,
                message=f"Person identified with {confidence:.1%} confidence",
                additional_matches=[
                    {
                        "person_id": match["person_id"],
                        "confidence": match["similarity"]
                    } for match in matches[1:3]  # Show top 3 matches
                ] if len(matches) > 1 else []
            )
        else:
            # No match found - log using Supabase
            log_data = {
                "id": str(uuid.uuid4()),
                "person_id": None,
                "person_name": None,
                "confidence": 0.0,
                "status": "no_match",
                "processing_time": processing_time,
                "created_by": current_user["sub"],
                "created_at": "now()"
            }
            await db_service.create_recognition_log(log_data)
            
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
    person_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user=Depends(get_current_user),
    db_service: DatabaseService = Depends(get_database_service)
):
    """Get recognition logs with pagination and filtering using Supabase."""
    try:
        # Use the enhanced database service method with filters
        result = await db_service.get_recognition_logs(
            page=page,
            size=size,
            status_filter=status_filter,
            person_id=person_id,
            start_date=start_date,
            end_date=end_date
        )
        
        logs = [RecognitionLogResponse(**log_data) for log_data in result["logs"]]
        
        return logs
        
    except Exception as e:
        logger.error(f"Failed to get recognition logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve recognition logs"
        )


@router.get("/stats", response_model=RecognitionStatsResponse)
async def get_recognition_stats(
    days_back: int = 30,
    current_user=Depends(get_current_user),
    db_service: DatabaseService = Depends(get_database_service),
    vector_db=Depends(get_vector_database_service)
):
    """Get recognition statistics using Supabase with time filtering."""
    try:
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        # Get recognition logs in date range from Supabase
        all_logs_result = await db_service.get_recognition_logs(
            page=1, 
            size=10000,
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat()
        )
        
        if not all_logs_result["logs"]:
            return RecognitionStatsResponse(
                total_recognitions=0,
                successful_recognitions=0,
                success_rate=0.0,
                average_confidence=0.0,
                average_processing_time=0.0,
                recognitions_today=0,
                recognitions_this_week=0,
                recognitions_this_month=0,
                date_range_days=days_back,
                analysis_period={
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                }
            )
        
        logs_data = all_logs_result["logs"]
        total_recognitions = len(logs_data)
        successful_logs = [log for log in logs_data if log["status"] == "success"]
        successful_recognitions = len(successful_logs)
        
        # Calculate statistics
        success_rate = (successful_recognitions / total_recognitions * 100) if total_recognitions > 0 else 0
        average_confidence = sum(log["confidence"] for log in successful_logs) / len(successful_logs) if successful_logs else 0
        average_processing_time = sum(log.get("processing_time", 0) for log in logs_data) / len(logs_data) if logs_data else 0
        
        # Time-based counts
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        recognitions_today = len([log for log in logs_data 
                                if datetime.fromisoformat(log["created_at"].replace('Z', '+00:00')).date() == today])
        recognitions_this_week = len([log for log in logs_data 
                                    if datetime.fromisoformat(log["created_at"].replace('Z', '+00:00')).date() >= week_ago])
        recognitions_this_month = len([log for log in logs_data 
                                     if datetime.fromisoformat(log["created_at"].replace('Z', '+00:00')).date() >= month_ago])
        
        # Get vector database stats
        vector_stats = await vector_db.get_database_stats()
        
        return RecognitionStatsResponse(
            total_recognitions=total_recognitions,
            successful_recognitions=successful_recognitions,
            success_rate=success_rate,
            average_confidence=average_confidence,
            average_processing_time=average_processing_time,
            recognitions_today=recognitions_today,
            recognitions_this_week=recognitions_this_week,
            recognitions_this_month=recognitions_this_month,
            date_range_days=days_back,
            vector_database_stats={
                "total_embeddings": vector_stats.get("total_vectors", 0),
                "index_size": vector_stats.get("index_size", 0)
            },
            analysis_period={
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"Failed to get recognition stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve recognition statistics"
        )


@router.get("/logs/export")
async def export_recognition_logs(
    format: str = "csv",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status_filter: Optional[str] = None,
    current_user=Depends(get_current_user),
    db_service: DatabaseService = Depends(get_database_service)
):
    """Export recognition logs in CSV or JSON format from Supabase."""
    try:
        # Get all logs with filtering
        result = await db_service.get_recognition_logs(
            page=1, 
            size=10000,
            status_filter=status_filter,
            start_date=start_date,
            end_date=end_date
        )
        logs_data = result["logs"]
        
        # Add export metadata
        export_info = {
            "exported_at": datetime.now().isoformat(),
            "exported_by": current_user.get("username", "unknown"),
            "total_records": len(logs_data),
            "filters": {
                "start_date": start_date,
                "end_date": end_date,
                "status_filter": status_filter
            },
            "database_source": "Supabase PostgreSQL"
        }
        
        if format.lower() == "csv":
            import csv
            import io
            
            # Create CSV content
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Export info header
            writer.writerow(["# Recognition Logs Export"])
            writer.writerow(["# Exported at:", export_info["exported_at"]])
            writer.writerow(["# Total records:", export_info["total_records"]])
            writer.writerow(["# Database:", export_info["database_source"]])
            writer.writerow([])
            
            # Data headers
            writer.writerow([
                "ID", "Person ID", "Person Name", "Confidence", 
                "Status", "Processing Time (s)", "Created By", "Created At"
            ])
            
            # Data rows
            for log in logs_data:
                writer.writerow([
                    log.get("id", ""),
                    log.get("person_id", ""),
                    log.get("person_name", "Unknown"),
                    log.get("confidence", 0),
                    log.get("status", ""),
                    log.get("processing_time", 0),
                    log.get("created_by", ""),
                    log.get("created_at", "")
                ])
            
            output.seek(0)
            
            return StreamingResponse(
                io.BytesIO(output.getvalue().encode()),
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=recognition_logs.csv"}
            )
        
        else:  # JSON format
            export_data = {
                "export_info": export_info,
                "logs": logs_data,
                "summary": {
                    "total_logs": len(logs_data),
                    "successful_recognitions": len([log for log in logs_data if log["status"] == "success"]),
                    "failed_recognitions": len([log for log in logs_data if log["status"] != "success"])
                }
            }
            
            return JSONResponse(
                content=export_data,
                headers={"Content-Disposition": "attachment; filename=recognition_logs.json"}
            )
        
    except Exception as e:
        logger.error(f"Failed to export recognition logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export recognition logs"
        )


@router.post("/batch-identify")
async def batch_identify_faces(
    images: List[str] = Form(..., description="List of base64 encoded images"),
    threshold: Optional[float] = Form(None, description="Custom similarity threshold"),
    save_logs: bool = Form(True, description="Whether to save recognition logs"),
    current_user=Depends(get_current_user),
    db_service: DatabaseService = Depends(get_database_service),
    face_service=Depends(get_face_recognition_service),
    vector_db=Depends(get_vector_database_service)
):
    """Batch identify multiple faces at once."""
    try:
        results = []
        batch_start_time = time.time()
        
        for i, image_base64 in enumerate(images):
            try:
                start_time = time.time()
                
                # Process image
                cv2_image, embeddings_data = await face_service.process_image_for_recognition(image_base64)
                
                if not embeddings_data:
                    processing_time = time.time() - start_time
                    result = {
                        "image_index": i,
                        "person_id": None,
                        "person_name": None,
                        "confidence": 0.0,
                        "status": "no_face",
                        "processing_time": processing_time,
                        "message": "No face detected"
                    }
                else:
                    # Get best embedding and search Pinecone
                    best_embedding = max(embeddings_data, key=lambda x: x['quality_score'])
                    query_embedding = best_embedding['embedding']
                    
                    similarity_threshold = threshold or face_service.similarity_threshold
                    matches = await vector_db.search_similar_faces(
                        query_embedding, 
                        top_k=3, 
                        threshold=similarity_threshold
                    )
                    
                    processing_time = time.time() - start_time
                    
                    if matches:
                        best_match = matches[0]
                        person_id = best_match["person_id"]
                        confidence = best_match["similarity"]
                        
                        # Get person from Supabase
                        person = await db_service.get_person_by_id(person_id)
                        person_name = person["name"] if person else "Unknown"
                        
                        result = {
                            "image_index": i,
                            "person_id": person_id,
                            "person_name": person_name,
                            "confidence": confidence,
                            "status": "success",
                            "processing_time": processing_time,
                            "message": f"Identified with {confidence:.1%} confidence"
                        }
                    else:
                        result = {
                            "image_index": i,
                            "person_id": None,
                            "person_name": None,
                            "confidence": 0.0,
                            "status": "no_match",
                            "processing_time": processing_time,
                            "message": "No match found"
                        }
                
                results.append(result)
                
                # Save log if requested
                if save_logs:
                    log_data = {
                        "id": str(uuid.uuid4()),
                        "person_id": result["person_id"],
                        "person_name": result["person_name"],
                        "confidence": result["confidence"],
                        "status": result["status"],
                        "processing_time": result["processing_time"],
                        "created_by": current_user["sub"],
                        "created_at": "now()"
                    }
                    await db_service.create_recognition_log(log_data)
                
            except Exception as e:
                logger.error(f"Failed to process image {i} in batch: {e}")
                results.append({
                    "image_index": i,
                    "person_id": None,
                    "person_name": None,
                    "confidence": 0.0,
                    "status": "error",
                    "processing_time": 0.0,
                    "message": f"Processing error: {str(e)}"
                })
        
        total_batch_time = time.time() - batch_start_time
        
        # Summary statistics
        successful = len([r for r in results if r["status"] == "success"])
        failed = len([r for r in results if r["status"] in ["no_face", "no_match", "error"]])
        
        return {
            "batch_results": results,
            "summary": {
                "total_images": len(images),
                "successful_identifications": successful,
                "failed_identifications": failed,
                "success_rate": (successful / len(images) * 100) if images else 0,
                "total_processing_time": total_batch_time,
                "average_time_per_image": total_batch_time / len(images) if images else 0
            },
            "batch_info": {
                "processed_at": datetime.now().isoformat(),
                "processed_by": current_user.get("username"),
                "logs_saved": save_logs,
                "threshold_used": threshold or face_service.similarity_threshold
            }
        }
        
    except Exception as e:
        logger.error(f"Batch identification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Batch face identification failed"
        )


@router.get("/similar/{person_id}")
async def find_similar_persons(
    person_id: str,
    top_k: int = 5,
    threshold: float = 0.7,
    current_user=Depends(get_current_user),
    db_service: DatabaseService = Depends(get_database_service),
    vector_db=Depends(get_vector_database_service)
):
    """Find persons similar to a given person using Pinecone similarity search."""
    try:
        # Verify person exists in Supabase
        person = await db_service.get_person_by_id(person_id)
        if not person:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Person {person_id} not found"
            )
        
        # Get person embeddings from Pinecone and find similar
        similar_persons = await vector_db.find_similar_persons(
            person_id=person_id,
            top_k=top_k,
            threshold=threshold
        )
        
        # Enrich with person data from Supabase
        enriched_results = []
        for similar in similar_persons:
            similar_person = await db_service.get_person_by_id(similar["person_id"])
            if similar_person:
                enriched_results.append({
                    **similar,
                    "person_name": similar_person["name"],
                    "person_description": similar_person.get("description"),
                    "person_active": similar_person["active"]
                })
        
        return {
            "source_person": {
                "id": person["id"],
                "name": person["name"],
                "description": person.get("description")
            },
            "similar_persons": enriched_results,
            "search_params": {
                "top_k": top_k,
                "threshold": threshold,
                "total_found": len(enriched_results)
            },
            "analysis_timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to find similar persons for {person_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to find similar persons"
        )