import logging
from uuid import UUID

from qdrant_client import QdrantClient
from qdrant_client.http import models as qm

from app.config import settings
from app.face.matching import Hit

logger = logging.getLogger(__name__)


class VectorStore:
    """Face embeddings in Qdrant. Point id == face_samples.id, payload carries person_id."""

    def __init__(self, host: str, port: int, collection: str, dimension: int):
        self.collection = collection
        self.dimension = dimension
        self.client = QdrantClient(host=host, port=port, timeout=10)

    def ensure_collection(self) -> None:
        if not self.client.collection_exists(self.collection):
            self.client.create_collection(
                self.collection,
                vectors_config=qm.VectorParams(size=self.dimension, distance=qm.Distance.COSINE),
            )
            self.client.create_payload_index(self.collection, "person_id", qm.PayloadSchemaType.KEYWORD)
            logger.info("Created Qdrant collection %s", self.collection)

    def add(self, sample_id: UUID, person_id: UUID, embedding: list[float]) -> None:
        self.client.upsert(
            self.collection,
            points=[qm.PointStruct(id=str(sample_id), vector=embedding, payload={"person_id": str(person_id)})],
            wait=True,
        )

    def search(self, embedding: list[float], limit: int = 20) -> list[Hit]:
        points = self.client.query_points(self.collection, query=embedding, limit=limit, with_payload=True).points
        return [Hit(point.payload["person_id"], point.score) for point in points]

    def delete_samples(self, sample_ids: list[UUID]) -> None:
        if sample_ids:
            self.client.delete(self.collection, points_selector=qm.PointIdsList(points=[str(s) for s in sample_ids]))

    def delete_person(self, person_id: UUID) -> None:
        self.client.delete(
            self.collection,
            points_selector=qm.FilterSelector(
                filter=qm.Filter(must=[qm.FieldCondition(key="person_id", match=qm.MatchValue(value=str(person_id)))])
            ),
        )

    def count(self) -> int:
        return self.client.count(self.collection, exact=True).count

    def healthy(self) -> bool:
        try:
            self.client.collection_exists(self.collection)
            return True
        except Exception:
            return False


vector_store = VectorStore(
    settings.qdrant_host, settings.qdrant_port, settings.qdrant_collection, settings.embedding_size
)
