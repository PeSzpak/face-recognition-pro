from typing import Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.database import get_database
from app.core.security import get_current_user
from app.services.vector_database import get_vector_database_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/stats")
async def get_dashboard_stats(
    current_user=Depends(get_current_user),
    db=Depends(get_database),
    vector_db=Depends(get_vector_database_service)
) -> Dict:
    """Get dashboard statistics."""
    try:
        # Get total persons
        persons_result = db.table("persons").select("*", count="exact").execute()
        total_persons = len(persons_result.data) if persons_result.data else 0
        
        # Get active persons
        active_persons_result = db.table("persons").select("*").eq("active", True).execute()
        active_persons = len(active_persons_result.data) if active_persons_result.data else 0
        
        # Get recognition logs
        logs_result = db.table("recognition_logs").select("*").execute()
        total_recognitions = len(logs_result.data) if logs_result.data else 0
        
        # Get today's recognitions (simplified)
        from datetime import datetime
        today = datetime.now().date()
        recognitions_today = 0
        if logs_result.data:
            recognitions_today = len([
                log for log in logs_result.data 
                if datetime.fromisoformat(log["created_at"].replace('Z', '+00:00')).date() == today
            ])
        
        # Get successful recognitions
        successful_recognitions = 0
        if logs_result.data:
            successful_recognitions = len([
                log for log in logs_result.data 
                if log["status"] == "success"
            ])
        
        # Calculate accuracy
        accuracy = (successful_recognitions / total_recognitions * 100) if total_recognitions > 0 else 0
        
        # Get vector database stats
        vector_stats = vector_db.get_database_stats()
        
        return {
            "total_persons": total_persons,
            "active_persons": active_persons,
            "total_recognitions": total_recognitions,
            "recognitions_today": recognitions_today,
            "successful_recognitions": successful_recognitions,
            "accuracy": round(accuracy, 2),
            "vector_database": vector_stats
        }
        
    except Exception as e:
        logger.error(f"Failed to get dashboard stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve dashboard statistics"
        )


@router.get("/recent")
async def get_recent_activities(
    limit: int = 10,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
) -> List[Dict]:
    """Get recent activities."""
    try:
        # Get recent recognition logs with person names
        result = db.table("recognition_logs").select("""
            id, person_id, confidence, status, processing_time, created_at,
            persons.name as person_name
        """).join(
            "persons", "recognition_logs.person_id", "persons.id", how="left"
        ).order("created_at", desc=True).limit(limit).execute()
        
        activities = []
        if result.data:
            for log in result.data:
                activity_type = "recognition_success" if log["status"] == "success" else "recognition_failed"
                activities.append({
                    "id": log["id"],
                    "type": activity_type,
                    "person_id": log["person_id"],
                    "person_name": log.get("person_name", "Unknown"),
                    "confidence": log["confidence"],
                    "timestamp": log["created_at"],
                    "details": f"Recognition {'successful' if log['status'] == 'success' else 'failed'}"
                })
        
        return activities
        
    except Exception as e:
        logger.error(f"Failed to get recent activities: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve recent activities"
        )


@router.get("/analytics")
async def get_analytics(
    current_user=Depends(get_current_user),
    db=Depends(get_database)
) -> Dict:
    """Get detailed analytics."""
    try:
        # Get recognition logs for analysis
        logs_result = db.table("recognition_logs").select("*").execute()
        
        if not logs_result.data:
            return {
                "daily_recognitions": [],
                "success_rate_trend": [],
                "top_recognized_persons": [],
                "performance_metrics": {
                    "avg_processing_time": 0,
                    "peak_hour": "N/A",
                    "total_embeddings": 0
                }
            }
        
        logs_data = logs_result.data
        
        # Analyze logs (simplified analysis)
        from datetime import datetime, timedelta
        from collections import defaultdict, Counter
        
        # Daily recognitions for last 7 days
        daily_counts = defaultdict(int)
        success_counts = defaultdict(int)
        
        for log in logs_data:
            log_date = datetime.fromisoformat(log["created_at"].replace('Z', '+00:00')).date()
            daily_counts[str(log_date)] += 1
            if log["status"] == "success":
                success_counts[str(log_date)] += 1
        
        # Get persons for top recognized
        persons_result = db.table("persons").select("*").execute()
        persons_dict = {p["id"]: p["name"] for p in persons_result.data} if persons_result.data else {}
        
        # Count successful recognitions per person
        person_counts = Counter()
        processing_times = []
        
        for log in logs_data:
            if log["status"] == "success" and log["person_id"]:
                person_name = persons_dict.get(log["person_id"], "Unknown")
                person_counts[person_name] += 1
            processing_times.append(log["processing_time"])
        
        # Calculate average processing time
        avg_processing_time = sum(processing_times) / len(processing_times) if processing_times else 0
        
        # Get vector database stats for total embeddings
        vector_stats = get_vector_database_service().get_database_stats()
        total_embeddings = vector_stats.get("total_vectors", 0)
        
        return {
            "daily_recognitions": [
                {"date": date, "count": count} 
                for date, count in sorted(daily_counts.items())[-7:]
            ],
            "success_rate_trend": [
                {
                    "date": date, 
                    "rate": (success_counts[date] / daily_counts[date] * 100) if daily_counts[date] > 0 else 0
                } 
                for date in sorted(daily_counts.keys())[-7:]
            ],
            "top_recognized_persons": [
                {"name": name, "count": count} 
                for name, count in person_counts.most_common(5)
            ],
            "performance_metrics": {
                "avg_processing_time": round(avg_processing_time, 3),
                "peak_hour": "N/A",  # Would need hour-based analysis
                "total_embeddings": total_embeddings
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve analytics"
        )