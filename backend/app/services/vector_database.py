from typing import List, Dict, Any
import pinecone
from fastapi import HTTPException

class VectorDatabase:
    def __init__(self, api_key: str, environment: str, index_name: str):
        pinecone.init(api_key=api_key, environment=environment)
        self.index = pinecone.Index(index_name)

    def upsert_embeddings(self, embeddings: List[Dict[str, Any]]) -> None:
        try:
            self.index.upsert(vectors=embeddings)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error upserting embeddings: {str(e)}")

    def search_embeddings(self, query_vector: List[float], top_k: int = 5) -> List[Dict[str, Any]]:
        try:
            results = self.index.query(queries=[query_vector], top_k=top_k)
            return results['matches']
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error searching embeddings: {str(e)}")

    def delete_embedding(self, id: str) -> None:
        try:
            self.index.delete(ids=[id])
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error deleting embedding: {str(e)}")

    def close(self) -> None:
        pinecone.deinit()