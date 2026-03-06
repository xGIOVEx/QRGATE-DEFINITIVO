from datetime import datetime
from typing import List, Optional, Any
from sqlalchemy import String, Integer, DateTime, JSON, ForeignKey, Text, Boolean, Column
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector

class Base(DeclarativeBase):
    pass

class Agent(Base):
    __tablename__ = "agents"
    
    id: Mapped[str] = mapped_column(String, primary_key=True) # e.g. "outreach-agent"
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String, default="active") # active, disabled
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class AgentRun(Base):
    __tablename__ = "agent_runs"
    
    id: Mapped[str] = mapped_column(String, primary_key=True)
    agent_id: Mapped[str] = mapped_column(ForeignKey("agents.id"))
    status: Mapped[str] = mapped_column(String, default="pending") # pending, running, hitl, completed, failed
    plan_json: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    agent: Mapped["Agent"] = relationship()
    steps: Mapped[List["AgentStep"]] = relationship(back_populates="run", cascade="all, delete-orphan")
    state: Mapped["AgentState"] = relationship(back_populates="run", uselist=False, cascade="all, delete-orphan")

class AgentStep(Base):
    __tablename__ = "agent_steps"
    
    id: Mapped[str] = mapped_column(String, primary_key=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("agent_runs.id"))
    step_type: Mapped[str] = mapped_column(String) # tool, hitl, note, complete
    payload: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON)
    result: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String, default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    run: Mapped["AgentRun"] = relationship(back_populates="steps")

class AgentState(Base):
    __tablename__ = "agent_state"
    
    run_id: Mapped[str] = mapped_column(ForeignKey("agent_runs.id"), primary_key=True)
    memory_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    last_updated: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    run: Mapped["AgentRun"] = relationship(back_populates="state")

class ApprovalRequest(Base):
    __tablename__ = "approval_requests"
    
    id: Mapped[str] = mapped_column(String, primary_key=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("agent_runs.id"))
    agent_id: Mapped[str] = mapped_column(ForeignKey("agents.id"))
    payload: Mapped[dict[str, Any]] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String, default="pending") # pending, approved, rejected
    decision_reason: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Venue(Base):
    __tablename__ = "venues"
    
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    area: Mapped[Optional[str]] = mapped_column(String)
    venue_type: Mapped[Optional[str]] = mapped_column(String)
    raw_data: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String, default="discovered")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class OutreachEmail(Base):
    __tablename__ = "outreach_emails"
    
    id: Mapped[str] = mapped_column(String, primary_key=True)
    venue_id: Mapped[str] = mapped_column(ForeignKey("venues.id"))
    draft_content: Mapped[str] = mapped_column(Text)
    language: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="draft")
    batch_id: Mapped[Optional[str]] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class ContentAsset(Base):
    __tablename__ = "content_assets"
    
    id: Mapped[str] = mapped_column(String, primary_key=True)
    subject: Mapped[str] = mapped_column(String)
    language: Mapped[str] = mapped_column(String)
    content: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String, default="draft") # draft, fact_checked, published
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class ToolCallLog(Base):
    __tablename__ = "tool_call_log"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[Optional[str]] = mapped_column(String)
    agent_id: Mapped[Optional[str]] = mapped_column(String)
    tool_name: Mapped[str] = mapped_column(String)
    args: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON)
    result: Mapped[Optional[Text]] = mapped_column(Text)
    error: Mapped[Optional[str]] = mapped_column(Text)
    latency_ms: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class IdempotencyKey(Base):
    __tablename__ = "idempotency_keys"
    
    key: Mapped[str] = mapped_column(String, primary_key=True)
    action: Mapped[str] = mapped_column(String)
    result_payload: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class AuditLog(Base):
    __tablename__ = "audit_log"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    action: Mapped[str] = mapped_column(String)
    actor: Mapped[str] = mapped_column(String) # e.g. "admin-uuid" or "system"
    target_resource: Mapped[Optional[str]] = mapped_column(String)
    payload: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"
    
    id: Mapped[str] = mapped_column(String, primary_key=True)
    text: Mapped[str] = mapped_column(Text)
    metadata_json: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON)
    embedding = mapped_column(Vector(768)) # Default Gemini embedding dimension
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class EmbeddingIndexMeta(Base):
    __tablename__ = "embedding_index_meta"
    
    id: Mapped[str] = mapped_column(String, primary_key=True)
    last_indexed: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    index_type: Mapped[str] = mapped_column(String) # e.g. "pgvector", "vertex"
