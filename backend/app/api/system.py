from fastapi import APIRouter, HTTPException
from ..config import settings
from ..services.vector_database import get_vector_database_service
from ..core.database import get_database
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/system", tags=["system"])

@router.get("/health")
async def health_check():
    """Verificar saúde do sistema"""
    try:
        # Testar Supabase
        db = get_database()
        supabase_healthy = True
        try:
            result = db.table("persons").select("*").limit(1).execute()
            supabase_status = "healthy"
            supabase_data = f"{len(result.data)} registros"
        except Exception as e:
            supabase_healthy = False
            supabase_status = f"error: {str(e)}"
            supabase_data = "0 registros"
        
        # Testar Pinecone
        vector_db = get_vector_database_service()
        pinecone_stats = vector_db.get_stats()
        pinecone_healthy = "error" not in pinecone_stats
        
        return {
            "status": "healthy" if supabase_healthy and pinecone_healthy else "degraded",
            "message": "Face Recognition Pro API is running",
            "version": "1.0.0",
            "components": {
                "api": "healthy",
                "face_recognition": "healthy",
                "supabase": supabase_status,
                "supabase_data": supabase_data,
                "pinecone": "healthy" if pinecone_healthy else "error",
                "pinecone_stats": pinecone_stats
            },
            "config": {
                "model": settings.FACE_RECOGNITION_MODEL,
                "confidence_threshold": settings.CONFIDENCE_THRESHOLD,
                "max_file_size": f"{settings.MAX_FILE_SIZE / 1024 / 1024:.1f}MB",
                "pinecone_configured": bool(settings.PINECONE_API_KEY),
                "supabase_configured": bool(settings.SUPABASE_KEY)
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(500, f"System unhealthy: {str(e)}")

@router.post("/pinecone/test")
async def test_pinecone():
    """Testar funcionalidades do Pinecone"""
    try:
        import numpy as np
        
        vector_db = get_vector_database_service()
        
        # Criar embedding de teste
        test_embedding = np.random.rand(512).tolist()
        test_id = "test_vector_001"
        test_metadata = {
            "person_id": "test",
            "person_name": "Test User",
            "test": True
        }
        
        # 1. Inserir vetor de teste
        insert_success = vector_db.upsert_person_embedding(
            "test", test_embedding, 0, test_metadata
        )
        
        # 2. Buscar vetor similar
        search_results = vector_db.search_similar_faces(
            test_embedding, top_k=1, threshold=0.9
        )
        
        # 3. Remover vetor de teste
        delete_success = vector_db.delete_person_vectors("test")
        
        return {
            "test_results": {
                "insert": insert_success,
                "search": len(search_results) > 0,
                "delete": delete_success
            },
            "search_results": search_results,
            "message": "Teste concluído com sucesso"
        }
        
    except Exception as e:
        raise HTTPException(500, f"Erro no teste: {str(e)}")

@router.get("/stats")
async def get_system_stats():
    """Obter estatísticas do sistema"""
    try:
        db = get_database()
        vector_db = get_vector_database_service()
        
        # Stats do banco
        try:
            persons_result = db.table("persons").select("*").execute()
            logs_result = db.table("recognition_logs").select("*").execute()
            
            persons_count = len(persons_result.data)
            logs_count = len(logs_result.data)
        except:
            persons_count = 0
            logs_count = 0
        
        # Stats do Pinecone
        pinecone_stats = vector_db.get_stats()
        
        return {
            "database": {
                "total_persons": persons_count,
                "total_recognitions": logs_count
            },
            "pinecone": pinecone_stats,
            "system": {
                "model": settings.FACE_RECOGNITION_MODEL,
                "confidence_threshold": settings.CONFIDENCE_THRESHOLD,
                "debug_mode": settings.DEBUG
            }
        }
        
    except Exception as e:
        raise HTTPException(500, f"Erro ao obter estatísticas: {str(e)}")