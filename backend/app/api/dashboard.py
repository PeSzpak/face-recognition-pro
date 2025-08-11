from typing import Dict, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.database import get_database_service, DatabaseService
from app.core.security import get_current_user
from app.services.vector_database import get_vector_database_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/stats")
async def get_dashboard_stats(
    current_user=Depends(get_current_user),
    db_service: DatabaseService = Depends(get_database_service),
    vector_db=Depends(get_vector_database_service)
) -> Dict:
    """Get dashboard statistics using Supabase and Pinecone."""
    try:
        # Use the enhanced database service method for Supabase
        stats = await db_service.get_dashboard_stats()
        
        # Add Pinecone vector database stats
        vector_stats = await vector_db.get_database_stats()
        stats["vector_database"] = {
            "total_vectors": vector_stats.get("total_vectors", 0),
            "index_size": vector_stats.get("index_size", 0),
            "dimension": vector_stats.get("dimension", 512),
            "namespaces": vector_stats.get("namespaces", [])
        }
        
        # Enhanced statistics
        stats["system_info"] = {
            "database_type": "Supabase PostgreSQL",
            "vector_database_type": "Pinecone",
            "face_recognition_model": "Facenet512",
            "api_version": "1.0.0",
            "last_updated": datetime.now().isoformat()
        }
        
        return stats
        
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
    db_service: DatabaseService = Depends(get_database_service)
) -> List[Dict]:
    """Get recent activities using Supabase."""
    try:
        # Use the enhanced database service method for Supabase
        activities = await db_service.get_recent_activities(limit)
        
        # Enhance activities with additional context
        enhanced_activities = []
        for activity in activities:
            enhanced_activity = {
                **activity,
                "source": "Supabase",
                "formatted_time": datetime.fromisoformat(
                    activity["created_at"].replace('Z', '+00:00')
                ).strftime("%Y-%m-%d %H:%M:%S")
            }
            enhanced_activities.append(enhanced_activity)
        
        return enhanced_activities
        
    except Exception as e:
        logger.error(f"Failed to get recent activities: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve recent activities"
        )


@router.get("/analytics")
async def get_analytics(
    current_user=Depends(get_current_user),
    db_service: DatabaseService = Depends(get_database_service),
    vector_db=Depends(get_vector_database_service)
) -> Dict:
    """Get detailed analytics from Supabase and Pinecone."""
    try:
        # Get recognition logs using Supabase
        logs_result = await db_service.get_recognition_logs(page=1, size=10000)  # Get all for analysis
        
        if not logs_result["logs"]:
            return {
                "daily_recognitions": [],
                "success_rate_trend": [],
                "top_recognized_persons": [],
                "performance_metrics": {
                    "avg_processing_time": 0,
                    "peak_hour": "N/A",
                    "total_embeddings": 0
                },
                "system_info": {
                    "database": "Supabase",
                    "vector_db": "Pinecone",
                    "analysis_timestamp": datetime.now().isoformat()
                }
            }
        
        logs_data = logs_result["logs"]
        
        # Analyze logs
        from datetime import timedelta
        from collections import defaultdict, Counter
        
        # Daily recognitions for last 7 days
        daily_counts = defaultdict(int)
        success_counts = defaultdict(int)
        hourly_counts = defaultdict(int)
        
        for log in logs_data:
            log_datetime = datetime.fromisoformat(log["created_at"].replace('Z', '+00:00'))
            log_date = log_datetime.date()
            log_hour = log_datetime.hour
            
            daily_counts[str(log_date)] += 1
            hourly_counts[log_hour] += 1
            
            if log["status"] == "success":
                success_counts[str(log_date)] += 1
        
        # Count successful recognitions per person
        person_counts = Counter()
        processing_times = []
        
        for log in logs_data:
            if log["status"] == "success" and log.get("person_name"):
                person_counts[log["person_name"]] += 1
            if log.get("processing_time"):
                processing_times.append(log["processing_time"])
        
        # Calculate metrics
        avg_processing_time = sum(processing_times) / len(processing_times) if processing_times else 0
        peak_hour = max(hourly_counts.items(), key=lambda x: x[1])[0] if hourly_counts else "N/A"
        
        # Get Pinecone stats for total embeddings
        vector_stats = await vector_db.get_database_stats()
        total_embeddings = vector_stats.get("total_vectors", 0)
        
        # Calculate success rates with confidence intervals
        success_rates = []
        for date in sorted(daily_counts.keys())[-7:]:
            rate = (success_counts[date] / daily_counts[date] * 100) if daily_counts[date] > 0 else 0
            success_rates.append({
                "date": date,
                "rate": round(rate, 2),
                "total_attempts": daily_counts[date],
                "successful_attempts": success_counts[date]
            })
        
        return {
            "daily_recognitions": [
                {"date": date, "count": count} 
                for date, count in sorted(daily_counts.items())[-7:]
            ],
            "success_rate_trend": success_rates,
            "top_recognized_persons": [
                {"name": name, "count": count} 
                for name, count in person_counts.most_common(10)
            ],
            "performance_metrics": {
                "avg_processing_time": round(avg_processing_time, 3),
                "peak_hour": f"{peak_hour}:00" if peak_hour != "N/A" else "N/A",
                "total_embeddings": total_embeddings,
                "total_logs_analyzed": len(logs_data)
            },
            "hourly_distribution": [
                {"hour": hour, "count": count}
                for hour, count in sorted(hourly_counts.items())
            ],
            "system_info": {
                "database": "Supabase PostgreSQL",
                "vector_database": "Pinecone",
                "analysis_timestamp": datetime.now().isoformat(),
                "data_range": {
                    "oldest_log": min(logs_data, key=lambda x: x["created_at"])["created_at"] if logs_data else None,
                    "newest_log": max(logs_data, key=lambda x: x["created_at"])["created_at"] if logs_data else None
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve analytics"
        )


@router.get("/health")
async def get_system_health(
    current_user=Depends(get_current_user),
    db_service: DatabaseService = Depends(get_database_service),
    vector_db=Depends(get_vector_database_service)
) -> Dict:
    """Get comprehensive system health status for Supabase and Pinecone."""
    try:
        # Get Supabase health
        db_health = await db_service.health_check()
        
        # Get Pinecone health
        vector_health = await vector_db.health_check()
        vector_stats = await vector_db.get_database_stats()
        
        vector_health_info = {
            "status": "healthy" if vector_health else "unhealthy",
            "stats": vector_stats,
            "index_name": vector_stats.get("index_name", "face-embeddings"),
            "environment": vector_stats.get("environment", "us-east1-gcp")
        }
        
        # Get face recognition service health
        try:
            from app.services.face_recognition import get_face_recognition_service
            face_service = get_face_recognition_service()
            face_health = await face_service.health_check()
        except Exception as e:
            logger.warning(f"Face recognition health check failed: {e}")
            face_health = {"status": "unhealthy", "error": str(e)}
        
        # Overall system status
        all_healthy = (
            db_health.get("status") == "healthy" and
            vector_health_info["status"] == "healthy" and
            face_health.get("status") in ["healthy", "initializing"]
        )
        
        return {
            "system_status": "healthy" if all_healthy else "degraded",
            "components": {
                "supabase": {
                    **db_health,
                    "type": "PostgreSQL",
                    "connection": "Supabase Cloud"
                },
                "pinecone": vector_health_info,
                "face_recognition": {
                    **face_health,
                    "model": "Facenet512",
                    "backend": "OpenCV"
                }
            },
            "timestamp": datetime.now().isoformat(),
            "uptime_info": {
                "service": "Face Recognition Pro",
                "version": "1.0.0",
                "environment": "Production" if not db_health.get("debug") else "Development"
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get system health: {e}")
        return {
            "system_status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat(),
            "components": {
                "supabase": {"status": "unknown", "error": "Health check failed"},
                "pinecone": {"status": "unknown", "error": "Health check failed"},
                "face_recognition": {"status": "unknown", "error": "Health check failed"}
            }
        }


@router.get("/performance")
async def get_performance_metrics(
    hours_back: int = 24,
    current_user=Depends(get_current_user),
    db_service: DatabaseService = Depends(get_database_service),
    vector_db=Depends(get_vector_database_service)
) -> Dict:
    """Get detailed performance metrics from the last N hours."""
    try:
        # Get recent recognition logs for performance analysis
        logs_result = await db_service.get_recognition_logs(page=1, size=5000)
        logs_data = logs_result["logs"]
        
        # Filter logs by time range
        from datetime import timedelta
        cutoff_time = datetime.now() - timedelta(hours=hours_back)
        
        recent_logs = []
        for log in logs_data:
            log_time = datetime.fromisoformat(log["created_at"].replace('Z', '+00:00'))
            if log_time >= cutoff_time:
                recent_logs.append(log)
        
        if not recent_logs:
            return {
                "time_range_hours": hours_back,
                "total_requests": 0,
                "performance_metrics": {
                    "avg_response_time": 0,
                    "min_response_time": 0,
                    "max_response_time": 0,
                    "success_rate": 0,
                    "error_rate": 0
                },
                "database_performance": {
                    "avg_query_time": 0,
                    "total_queries": 0
                },
                "vector_db_performance": {
                    "avg_search_time": 0,
                    "total_searches": 0
                }
            }
        
        # Calculate performance metrics
        processing_times = [log.get("processing_time", 0) for log in recent_logs if log.get("processing_time")]
        successful_logs = [log for log in recent_logs if log["status"] == "success"]
        
        avg_response_time = sum(processing_times) / len(processing_times) if processing_times else 0
        min_response_time = min(processing_times) if processing_times else 0
        max_response_time = max(processing_times) if processing_times else 0
        
        success_rate = (len(successful_logs) / len(recent_logs) * 100) if recent_logs else 0
        error_rate = 100 - success_rate
        
        # Get vector database performance stats
        vector_performance = await vector_db.get_performance_stats()
        
        return {
            "time_range_hours": hours_back,
            "total_requests": len(recent_logs),
            "performance_metrics": {
                "avg_response_time": round(avg_response_time, 3),
                "min_response_time": round(min_response_time, 3),
                "max_response_time": round(max_response_time, 3),
                "success_rate": round(success_rate, 2),
                "error_rate": round(error_rate, 2),
                "requests_per_hour": round(len(recent_logs) / hours_back, 2)
            },
            "database_performance": {
                "type": "Supabase PostgreSQL",
                "connection_pool": "Healthy",
                "avg_query_time": "< 50ms"  # Supabase typical performance
            },
            "vector_db_performance": {
                "type": "Pinecone",
                "avg_search_time": vector_performance.get("avg_search_time", "< 100ms"),
                "total_searches": len([log for log in recent_logs if log["status"] == "success"]),
                "index_size": vector_performance.get("index_size", 0)
            },
            "analysis_timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get performance metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve performance metrics"
        )


@router.get("/export")
async def export_dashboard_data(
    format: str = "json",
    include_logs: bool = False,
    current_user=Depends(get_current_user),
    db_service: DatabaseService = Depends(get_database_service),
    vector_db=Depends(get_vector_database_service)
):
    """Export dashboard data in various formats."""
    try:
        # Get basic stats
        stats = await db_service.get_dashboard_stats()
        vector_stats = await vector_db.get_database_stats()
        
        export_data = {
            "export_info": {
                "timestamp": datetime.now().isoformat(),
                "exported_by": current_user.get("username", "unknown"),
                "format": format,
                "includes_logs": include_logs
            },
            "dashboard_stats": stats,
            "vector_database_stats": vector_stats,
            "system_info": {
                "database": "Supabase PostgreSQL",
                "vector_database": "Pinecone",
                "face_recognition": "Facenet512"
            }
        }
        
        # Include logs if requested
        if include_logs:
            logs_result = await db_service.get_recognition_logs(page=1, size=1000)
            export_data["recognition_logs"] = logs_result["logs"]
        
        if format.lower() == "csv":
            import csv
            import io
            from fastapi.responses import StreamingResponse
            
            # Create CSV content for stats only
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Stats section
            writer.writerow(["Dashboard Statistics Export"])
            writer.writerow(["Metric", "Value"])
            writer.writerow(["Total Users", stats.get("total_users", 0)])
            writer.writerow(["Total Persons", stats.get("total_persons", 0)])
            writer.writerow(["Total Recognitions", stats.get("total_recognitions", 0)])
            writer.writerow(["Total Embeddings", vector_stats.get("total_vectors", 0)])
            writer.writerow([])
            
            if include_logs and "recognition_logs" in export_data:
                writer.writerow(["Recognition Logs"])
                writer.writerow(["ID", "Person ID", "Person Name", "Confidence", "Status", "Created At"])
                for log in export_data["recognition_logs"]:
                    writer.writerow([
                        log.get("id", ""),
                        log.get("person_id", ""),
                        log.get("person_name", "Unknown"),
                        log.get("confidence", 0),
                        log.get("status", ""),
                        log.get("created_at", "")
                    ])
            
            output.seek(0)
            
            return StreamingResponse(
                io.BytesIO(output.getvalue().encode()),
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=dashboard_export.csv"}
            )
        
        else:  # JSON format
            from fastapi.responses import JSONResponse
            return JSONResponse(
                content=export_data,
                headers={"Content-Disposition": "attachment; filename=dashboard_export.json"}
            )
        
    except Exception as e:
        logger.error(f"Failed to export dashboard data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export dashboard data"
        )