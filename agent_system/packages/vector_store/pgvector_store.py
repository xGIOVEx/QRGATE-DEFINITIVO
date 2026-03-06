from abc import ABC, abstractmethod
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import Session
from models import KnowledgeChunk

# Use Gemini to generate vectors when inserting
from google import genai
from google.genai import types

class VectorStore(ABC):
    @abstractmethod
    async def store_embedding(self, text: str, metadata: Dict[str, Any]) -> str:
        """Stores text and its embedding, returns the chunk ID."""
        pass
        
    @abstractmethod
    async def semantic_match(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Returns the most relevant chunks based on semantic similarity."""
        pass

class CloudSQLPgVectorStore(VectorStore):
    def __init__(self, db_session: AsyncSession, project_id: str):
        self.db = db_session
        self.client = genai.Client(http_options={'api_version': 'v1alpha'})
        self.model = 'text-embedding-004'

    async def _get_embedding(self, text: str) -> List[float]:
        response = self.client.models.embed_content(
            model=self.model,
            contents=text,
        )
        return response.embeddings[0].values

    async def store_embedding(self, text: str, metadata: Dict[str, Any] = None) -> str:
        import uuid
        vector = await self._get_embedding(text)
        chunk_id = f"chunk-{uuid.uuid4()}"
        
        chunk = KnowledgeChunk(
            id=chunk_id,
            text=text,
            metadata_json=metadata or {},
            embedding=vector
        )
        self.db.add(chunk)
        await self.db.commit()
        return chunk_id

    async def semantic_match(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        query_vector = await self._get_embedding(query)
        
        # pgvector SQLAlchemy query for L2 distance (<->)
        stmt = select(KnowledgeChunk).order_by(KnowledgeChunk.embedding.l2_distance(query_vector)).limit(top_k)
        result = await self.db.execute(stmt)
        chunks = result.scalars().all()
        
        return [{"id": c.id, "text": c.text, "metadata": c.metadata_json} for c in chunks]


class VertexAIVectorSearchStore(VectorStore):
    """
    Prepared for future scalability to millions of vectors per the Mandate.
    Currently deactivated via config.
    """
    def __init__(self, project_id: str, location: str, index_endpoint_id: str):
        self.project_id = project_id
        self.location = location
        self.index_endpoint_id = index_endpoint_id
        
    async def store_embedding(self, text: str, metadata: Dict[str, Any] = None) -> str:
        raise NotImplementedError("Vertex AI Vector Search is currently disabled in favor of pgvector.")

    async def semantic_match(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        raise NotImplementedError("Vertex AI Vector Search is currently disabled in favor of pgvector.")
