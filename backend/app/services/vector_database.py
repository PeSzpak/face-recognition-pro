import pinecone
import logging
from typing import List, Dict, Optional
from ..config import settings
import time

logger = logging.getLogger(__name__)

class VectorDatabaseService:
    def __init__(self):
        self.index_name = settings.PINECONE_INDEX_NAME
        self.dimension = 512
        self.metric = 'cosine'
        self.index = None
        self._initialize_pinecone()
    
    def _initialize_pinecone(self):
        """Inicializar conexão com Pinecone"""
        try:
            pinecone.init(
                api_key=settings.PINECONE_API_KEY,
                environment=settings.PINECONE_ENVIRONMENT
            )
            
            logger.info("Pinecone inicializado com sucesso")
            
            # Verificar se índice existe
            existing_indexes = pinecone.list_indexes()
            
            if self.index_name not in existing_indexes:
                logger.info(f"Criando índice {self.index_name}...")
                
                pinecone.create_index(
                    name=self.index_name,
                    dimension=self.dimension,
                    metric=self.metric,
                    pod_type="p1.x1"
                )
                
                # Aguardar criação
                while self.index_name not in pinecone.list_indexes():
                    logger.info("Aguardando criação do índice...")
                    time.sleep(2)
                
                logger.info(f"Índice {self.index_name} criado com sucesso")
            
            # Conectar ao índice
            self.index = pinecone.Index(self.index_name)
            
            # Verificar status
            stats = self.index.describe_index_stats()
            logger.info(f"Conectado ao índice. Vetores: {stats.total_vector_count}")
            
        except Exception as e:
            logger.error(f"Erro ao inicializar Pinecone: {str(e)}")
            self.index = None
    
    def search_similar_faces(self, query_embedding: List[float], top_k: int = 5, 
                           threshold: float = 0.6) -> List[Dict]:
        """Buscar faces similares - compatível com o código existente"""
        try:
            if self.index is None:
                logger.warning("Pinecone não inicializado")
                return []
            
            query_response = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True,
                include_values=False
            )
            
            matches = []
            for match in query_response.matches:
                similarity = match.score
                
                if similarity >= threshold:
                    matches.append({
                        'person_id': match.metadata.get('person_id'),
                        'similarity': similarity,
                        'vector_id': match.id,
                        'metadata': match.metadata
                    })
            
            logger.info(f"Encontrados {len(matches)} matches acima do threshold {threshold}")
            return matches
            
        except Exception as e:
            logger.error(f"Erro na busca vetorial: {str(e)}")
            return []
    
    def upsert_person_embedding(self, person_id: str, embedding: List[float], 
                              photo_index: int = 0, metadata: Dict = None) -> bool:
        """Inserir embedding de uma pessoa"""
        try:
            if self.index is None:
                logger.error("Pinecone não inicializado")
                return False
            
            vector_id = f"{person_id}_{photo_index}"
            
            vector_metadata = {
                'person_id': person_id,
                'photo_index': photo_index,
                **(metadata or {})
            }
            
            self.index.upsert(
                vectors=[(vector_id, embedding, vector_metadata)]
            )
            
            logger.info(f"Embedding inserido: {vector_id}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao inserir embedding: {str(e)}")
            return False
    
    def delete_person_vectors(self, person_id: str) -> bool:
        """Remover todos os vetores de uma pessoa"""
        try:
            if self.index is None:
                return False
            
            # Buscar vetores da pessoa
            query_response = self.index.query(
                vector=[0.0] * self.dimension,
                top_k=10000,
                filter={"person_id": {"$eq": person_id}},
                include_metadata=True
            )
            
            vector_ids = [match.id for match in query_response.matches]
            
            if vector_ids:
                self.index.delete(ids=vector_ids)
                logger.info(f"Removidos {len(vector_ids)} vetores da pessoa {person_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Erro ao remover vetores: {str(e)}")
            return False
    
    def get_stats(self) -> Dict:
        """Obter estatísticas do índice"""
        try:
            if self.index is None:
                return {"error": "Pinecone não inicializado"}
            
            stats = self.index.describe_index_stats()
            
            return {
                "total_vectors": stats.total_vector_count,
                "dimension": stats.dimension,
                "index_fullness": stats.index_fullness,
                "namespaces": dict(stats.namespaces) if stats.namespaces else {}
            }
            
        except Exception as e:
            logger.error(f"Erro ao obter estatísticas: {str(e)}")
            return {"error": str(e)}

# Instância global
vector_db_service = VectorDatabaseService()

def get_vector_database_service():
    return vector_db_service