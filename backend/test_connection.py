# CRIAR: backend/test_connection.py
import asyncio
from app.config import settings
from app.core.database import get_database
from app.services.vector_database import get_vector_database_service

async def test_connections():
    """Testar todas as conexões"""
    print("🔄 Testando conexões...")
    
    # 1. Testar Supabase
    try:
        db = get_database()
        result = db.table("persons").select("*").limit(1).execute()
        print(f"✅ Supabase: {len(result.data)} registros encontrados")
    except Exception as e:
        print(f"❌ Supabase: {e}")
    
    # 2. Testar Pinecone
    try:
        vector_db = get_vector_database_service()
        stats = vector_db.get_stats()
        print(f"✅ Pinecone: {stats.get('total_vectors', 0)} vetores")
    except Exception as e:
        print(f"❌ Pinecone: {e}")
    
    print("✅ Testes concluídos!")

if __name__ == "__main__":
    asyncio.run(test_connections())