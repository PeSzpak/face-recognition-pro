import logging
import time
from typing import List, Dict, Optional, Tuple
import numpy as np
import pinecone
from app.config import settings
from app.core.exceptions import VectorDatabaseException

logger = logging.getLogger(__name__)


class VectorDatabaseService:
    def __init__(self):
        self.index_name = settings.pinecone_index_name
        self.embedding_dimension = 512  # Facenet512 embedding size
        self.index = None
        self._initialize_pinecone()
    
    def _initialize_pinecone(self):
        """Initialize Pinecone connection and index."""
        try:
            # Initialize Pinecone
            pinecone.init(
                api_key=settings.pinecone_api_key,
                environment=settings.pinecone_environment
            )
            
            # Check if index exists, create if not
            if self.index_name not in pinecone.list_indexes():
                logger.info(f"Creating Pinecone index: {self.index_name}")
                pinecone.create_index(
                    name=self.index_name,
                    dimension=self.embedding_dimension,
                    metric="cosine",
                    pod_type="starter"  # Free tier
                )
                # Wait for index to be ready
                time.sleep(10)
            
            # Connect to index
            self.index = pinecone.Index(self.index_name)
            
            # Get index stats
            stats = self.index.describe_index_stats()
            logger.info(f"Connected to Pinecone index: {self.index_name}")
            logger.info(f"Index stats: {stats}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Pinecone: {e}")
            raise VectorDatabaseException(f"Pinecone initialization failed: {str(e)}")
    
    def upsert_person_embeddings(self, person_id: str, embeddings: List[np.ndarray], 
                                metadata: Optional[Dict] = None) -> bool:
        """Upsert person embeddings to vector database."""
        try:
            vectors = []
            base_metadata = metadata or {}
            
            for i, embedding in enumerate(embeddings):
                vector_id = f"{person_id}_embedding_{i}"
                vector_metadata = {
                    **base_metadata,
                    "person_id": person_id,
                    "embedding_index": i,
                    "timestamp": time.time()
                }
                
                vectors.append({
                    "id": vector_id,
                    "values": embedding.tolist(),
                    "metadata": vector_metadata
                })
            
            # Upsert vectors in batches
            batch_size = 100
            for i in range(0, len(vectors), batch_size):
                batch = vectors[i:i + batch_size]
                self.index.upsert(vectors=batch)
            
            logger.info(f"Upserted {len(vectors)} embeddings for person {person_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to upsert embeddings for person {person_id}: {e}")
            raise VectorDatabaseException(f"Failed to upsert embeddings: {str(e)}")
    
    def search_similar_faces(self, query_embedding: np.ndarray, 
                           top_k: int = 10, threshold: float = None) -> List[Dict]:
        """Search for similar faces in vector database."""
        try:
            if threshold is None:
                threshold = settings.confidence_threshold
            
            # Query vector database
            query_response = self.index.query(
                vector=query_embedding.tolist(),
                top_k=top_k,
                include_values=False,
                include_metadata=True
            )
            
            # Process results
            matches = []
            for match in query_response.matches:
                similarity = match.score
                
                # Filter by threshold
                if similarity >= threshold:
                    matches.append({
                        "id": match.id,
                        "person_id": match.metadata.get("person_id"),
                        "similarity": similarity,
                        "metadata": match.metadata
                    })
            
            # Group by person_id and get best match per person
            person_matches = {}
            for match in matches:
                person_id = match["person_id"]
                if person_id not in person_matches or match["similarity"] > person_matches[person_id]["similarity"]:
                    person_matches[person_id] = match
            
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
            # Query all vectors for this person
            query_response = self.index.query(
                vector=[0.0] * self.embedding_dimension,  # Dummy vector
                top_k=10000,  # Large number to get all
                include_values=False,
                include_metadata=True,
                filter={"person_id": person_id}
            )
            
            # Extract vector IDs
            vector_ids = [match.id for match in query_response.matches]
            
            if vector_ids:
                # Delete vectors in batches
                batch_size = 1000
                for i in range(0, len(vector_ids), batch_size):
                    batch = vector_ids[i:i + batch_size]
                    self.index.delete(ids=batch)
                
                logger.info(f"Deleted {len(vector_ids)} embeddings for person {person_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete embeddings for person {person_id}: {e}")
            raise VectorDatabaseException(f"Failed to delete embeddings: {str(e)}")
    
    def update_person_metadata(self, person_id: str, metadata_updates: Dict) -> bool:
        """Update metadata for all embeddings of a person."""
        try:
            # This is a limitation of Pinecone - we need to fetch, update, and upsert
            # For now, we'll skip this operation or implement it when needed
            logger.warning("Metadata update not implemented for Pinecone")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update metadata for person {person_id}: {e}")
            return False
    
    def get_person_embedding_count(self, person_id: str) -> int:
        """Get number of embeddings stored for a person."""
        try:
            query_response = self.index.query(
                vector=[0.0] * self.embedding_dimension,
                top_k=10000,
                include_values=False,
                include_metadata=True,
                filter={"person_id": person_id}
            )
            
            return len(query_response.matches)
            
        except Exception as e:
            logger.error(f"Failed to get embedding count for person {person_id}: {e}")
            return 0
    
    def get_database_stats(self) -> Dict:
        """Get vector database statistics."""
        try:
            stats = self.index.describe_index_stats()
            
            return {
                "total_vectors": stats.total_vector_count,
                "dimension": stats.dimension,
                "index_fullness": stats.index_fullness,
                "namespaces": stats.namespaces
            }
            
        except Exception as e:
            logger.error(f"Failed to get database stats: {e}")
            return {}
    
    def health_check(self) -> bool:
        """Check if vector database is healthy."""
        try:
            stats = self.index.describe_index_stats()
            return True
        except Exception as e:
            logger.error(f"Vector database health check failed: {e}")
            return False


# Global vector database service instance
vector_db_service = VectorDatabaseService()


def get_vector_database_service() -> VectorDatabaseService:
    """Dependency to get vector database service."""
    return vector_db_service