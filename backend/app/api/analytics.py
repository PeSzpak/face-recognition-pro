from typing import Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.database import get_database
from app.core.security import get_current_user
from app.services.vector_database import get_vector_database_service
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/overview")
async def get_analytics_overview(
    days: int = 7,
    current_user=Depends(get_current_user),
    db=Depends(get_database),
    vector_db=Depends(get_vector_database_service)
) -> Dict:
    """Get analytics overview with daily stats for the last N days."""
    try:
        # Get daily recognitions for last N days
        daily_stats = db.execute_query(
            """
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as total_count,
                COUNT(CASE WHEN status = 'success' THEN 1 END) as success_count,
                AVG(confidence) as avg_confidence,
                AVG(processing_time) as avg_processing_time
            FROM recognition_logs
            WHERE created_at >= CURRENT_DATE - INTERVAL '%s days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
            """,
            (days,)
        )
        
        daily_recognitions = []
        success_rate_trend = []
        
        if daily_stats:
            for stat in daily_stats:
                date_str = stat["date"].isoformat() if stat["date"] else None
                total = stat["total_count"] or 0
                success = stat["success_count"] or 0
                success_rate = (success / total * 100) if total > 0 else 0
                
                daily_recognitions.append({
                    "date": date_str,
                    "count": total
                })
                
                success_rate_trend.append({
                    "date": date_str,
                    "rate": round(success_rate, 2)
                })
        
        # Get top recognized persons
        top_persons = db.execute_query(
            """
            SELECT 
                p.name,
                COUNT(rl.id) as recognition_count
            FROM persons p
            INNER JOIN recognition_logs rl ON p.id = rl.person_id
            WHERE rl.status = 'success'
            GROUP BY p.id, p.name
            ORDER BY recognition_count DESC
            LIMIT 5
            """
        )
        
        top_recognized_persons = []
        if top_persons:
            top_recognized_persons = [
                {
                    "name": person["name"],
                    "count": person["recognition_count"]
                }
                for person in top_persons
            ]
        
        # Calculate average processing time
        avg_time_result = db.execute_query(
            "SELECT AVG(processing_time) as avg_time FROM recognition_logs WHERE processing_time IS NOT NULL"
        )
        avg_processing_time = float(avg_time_result[0]["avg_time"]) if avg_time_result and avg_time_result[0]["avg_time"] else 0
        
        # Get vector database stats
        vector_stats = vector_db.get_database_stats()
        total_embeddings = vector_stats.get("total_vectors", 0)
        
        # Find peak hour (simplified)
        peak_hour_result = db.execute_query(
            """
            SELECT 
                EXTRACT(HOUR FROM created_at) as hour,
                COUNT(*) as count
            FROM recognition_logs
            GROUP BY EXTRACT(HOUR FROM created_at)
            ORDER BY count DESC
            LIMIT 1
            """
        )
        
        peak_hour = "N/A"
        if peak_hour_result and peak_hour_result[0]["hour"] is not None:
            peak_hour = f"{int(peak_hour_result[0]['hour']):02d}:00"
        
        return {
            "daily_recognitions": daily_recognitions,
            "success_rate_trend": success_rate_trend,
            "top_recognized_persons": top_recognized_persons,
            "performance_metrics": {
                "avg_processing_time": round(avg_processing_time, 3),
                "peak_hour": peak_hour,
                "total_embeddings": total_embeddings
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get analytics overview: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve analytics: {str(e)}"
        )


@router.get("/person/{person_id}")
async def get_person_analytics(
    person_id: str,
    days: int = 30,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
) -> Dict:
    """Get analytics for a specific person."""
    try:
        # Verify person exists
        person_result = db.execute_query(
            "SELECT id, name FROM persons WHERE id = %s",
            (person_id,)
        )
        
        if not person_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Person not found"
            )
        
        person = person_result[0]
        
        # Get recognition stats
        stats = db.execute_query(
            """
            SELECT 
                COUNT(*) as total_recognitions,
                COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_recognitions,
                AVG(CASE WHEN status = 'success' THEN confidence END) as avg_confidence,
                MAX(created_at) as last_recognition
            FROM recognition_logs
            WHERE person_id = %s AND created_at >= CURRENT_DATE - INTERVAL '%s days'
            """,
            (person_id, days)
        )
        
        if not stats:
            stats = [{
                "total_recognitions": 0,
                "successful_recognitions": 0,
                "avg_confidence": 0,
                "last_recognition": None
            }]
        
        # Get daily recognition trend
        daily_trend = db.execute_query(
            """
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
            FROM recognition_logs
            WHERE person_id = %s AND created_at >= CURRENT_DATE - INTERVAL '%s days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
            """,
            (person_id, days)
        )
        
        trend_data = []
        if daily_trend:
            trend_data = [
                {
                    "date": day["date"].isoformat() if day["date"] else None,
                    "count": day["count"]
                }
                for day in daily_trend
            ]
        
        return {
            "person_name": person["name"],
            "total_recognitions": stats[0]["total_recognitions"] or 0,
            "successful_recognitions": stats[0]["successful_recognitions"] or 0,
            "avg_confidence": round(float(stats[0]["avg_confidence"]) if stats[0]["avg_confidence"] else 0, 4),
            "last_recognition": stats[0]["last_recognition"].isoformat() if stats[0]["last_recognition"] else None,
            "daily_trend": trend_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get person analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve person analytics: {str(e)}"
        )
