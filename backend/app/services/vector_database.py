import logging
import time
import uuid
import hashlib
from typing import List, Dict, Optional
import numpy as np
from qdrant_client import QdrantClient
from qdrant_client.http import models
from qdrant_client.http.models import Distance, VectorParams, PointStruct
from app.config import settings
from app.core.exceptions import VectorDatabaseException

logger = logging.getLogger(__name__)


class QdrantVectorService:
    def __init__(self):
        self.collection_name = settings.qdrant_collection_name
        self.embedding_dimension = 512  # Facenet512 embedding size
        self.client = None
        self._initialize_qdrant()
    
    def _initialize_qdrant(self):
        """Initialize Qdrant connection and collection."""
        try:
            # Connect to Qdrant
            self.client = QdrantClient(
                host=settings.qdrant_host,
                port=settings.qdrant_port
            )
            
            # Check if collection exists
            collections = self.client.get_collections().collections
            collection_names = [c.name for c in collections]
            
            if self.collection_name not in collection_names:
                logger.info(f"Creating Qdrant collection: {self.collection_name}")
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=self.embedding_dimension,
                        distance=Distance.COSINE
                    )
                )
            
            # Get collection info
            collection_info = self.client.get_collection(self.collection_name)
            logger.info(f"Connected to Qdrant collection: {self.collection_name}")
            logger.info(f"Collection info: {collection_info}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Qdrant: {e}")
            raise VectorDatabaseException(f"Qdrant initialization failed: {str(e)}")
    
    def upsert_person_embeddings(self, person_id: str, embeddings: List[np.ndarray], 
                                metadata: Optional[Dict] = None) -> bool:
        """Upsert person embeddings to vector database."""
        try:
            points = []
            base_metadata = metadata or {}
            
            for i, embedding in enumerate(embeddings):
                # Generate a valid UUID for Qdrant point ID
                # Use person_id + index + timestamp to create unique UUID
                unique_string = f"{person_id}_{i}_{int(time.time())}"
                point_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, unique_string)
                
                point_metadata = {
                    **base_metadata,
                    "person_id": person_id,
                    "embedding_index": i,
                    "timestamp": time.time()
                }
                
                points.append(
                    PointStruct(
                        id=str(point_uuid),  # UUID as string
                        vector=embedding.tolist(),
                        payload=point_metadata
                    )
                )
            
            # Upsert points
            self.client.upsert(
                collection_name=self.collection_name,
                points=points
            )
            
            logger.info(f"Upserted {len(points)} embeddings for person {person_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to upsert embeddings for person {person_id}: {e}")
            raise VectorDatabaseException(f"Failed to upsert embeddings: {str(e)}")
    
    def search_similar_faces(self, query_embedding: np.ndarray, 
                           top_k: int = 10, threshold: float = None) -> List[Dict]:
        """Search for similar faces in vector database."""
        try:
            if threshold is None:
                threshold = settings.similarity_threshold
            
            # Search in Qdrant
            search_result = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_embedding.tolist(),
                limit=top_k,
                score_threshold=threshold
            )
            
            # Process results and group by person_id
            person_matches = {}
            for hit in search_result:
                person_id = hit.payload.get("person_id")
                similarity = hit.score
                
                if person_id not in person_matches or similarity > person_matches[person_id]["similarity"]:
                    person_matches[person_id] = {
                        "id": hit.id,
                        "person_id": person_id,
                        "similarity": similarity,
                        "metadata": hit.payload
                    }
            
            # Sort by similarity
            final_matches = sorted(person_matches.values(), key=lambda x: x["similarity"], reverse=True)
            
            logger.info(f"Found {len(final_matches)} similar faces above threshold {threshold}")
            return final_matches
            
        except Exception as e:
            logger.error(f"Face search failed: {e}")
            raise VectorDatabaseException(f"Face search failed: {str(e)}")
    
    def delete_person_embeddings(self, person_id: str) -> bool:
        """Delete all embeddings for a person."""
        try:
            # Delete by filter
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=models.FilterSelector(
                    filter=models.Filter(
                        must=[
                            models.FieldCondition(
                                key="person_id",
                                match=models.MatchValue(value=person_id)
                            )
                        ]
                    )
                )
            )
            
            logger.info(f"Deleted embeddings for person {person_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete embeddings for person {person_id}: {e}")
            raise VectorDatabaseException(f"Failed to delete embeddings: {str(e)}")
    
    def get_person_embedding_count(self, person_id: str) -> int:
        """Get number of embeddings stored for a person."""
        try:
            # Count by scrolling with filter
            result = self.client.scroll(
                collection_name=self.collection_name,
                scroll_filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="person_id",
                            match=models.MatchValue(value=person_id)
                        )
                    ]
                ),
                limit=10000
            )
            
            return len(result[0])
            
        except Exception as e:
            logger.error(f"Failed to get embedding count for person {person_id}: {e}")
            return 0
    
    def get_database_stats(self) -> Dict:
        """Get vector database statistics."""
        try:
            collection_info = self.client.get_collection(self.collection_name)
            
            return {
                "total_vectors": collection_info.points_count,
                "dimension": self.embedding_dimension,
                "collection_name": self.collection_name,
                "status": collection_info.status
            }
            
        except Exception as e:
            logger.error(f"Failed to get database stats: {e}")
            return {}
    
    def health_check(self) -> bool:
        """Check if vector database is healthy."""
        try:
            collection_info = self.client.get_collection(self.collection_name)
            return collection_info.status == "green"
        except Exception as e:
            logger.error(f"Vector database health check failed: {e}")
            return False


# Global vector database service instance
_vector_db_service: Optional[QdrantVectorService] = None


def get_vector_database_service() -> QdrantVectorService:
    """Dependency to get vector database service with lazy initialization."""
    global _vector_db_service
    if _vector_db_service is None:
        _vector_db_service = QdrantVectorService()
    return _vector_db_service
