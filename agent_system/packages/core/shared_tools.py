from typing import Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from models import ApprovalRequest, AgentState, ToolCallLog

async def create_approval_request(db: AsyncSession, run_id: str, agent_id: str, payload: Dict[str, Any]) -> str:
    import uuid
    req_id = f"approval-{uuid.uuid4()}"
    req = ApprovalRequest(
        id=req_id,
        run_id=run_id,
        agent_id=agent_id,
        payload=payload
    )
    db.add(req)
    await db.commit()
    # Trigger Pub/Sub notification here
    return req_id

async def append_run_note(db: AsyncSession, run_id: str, note: str) -> bool:
    """Internal memo pad for agent reflection."""
    # Stored inherently in step logs but explicitly appended to memory
    state = await db.get(AgentState, run_id)
    if state:
        notes = state.memory_json.get("notes", [])
        notes.append(note)
        state.memory_json["notes"] = notes
        await db.commit()
    return True

async def load_agent_memory(db: AsyncSession, run_id: str) -> Dict[str, Any]:
    state = await db.get(AgentState, run_id)
    if not state:
        # initialize fresh state if none exists
        state = AgentState(run_id=run_id, memory_json={})
        db.add(state)
        await db.commit()
    return state.memory_json

async def save_agent_memory(db: AsyncSession, run_id: str, updates: Dict[str, Any]) -> bool:
    state = await db.get(AgentState, run_id)
    if state:
        state.memory_json.update(updates)
        await db.commit()
    return True

async def enqueue_followup_task(task_payload: Dict[str, Any], execute_after_sec: int) -> str:
    """Uses Google Cloud Tasks to ensure guaranteed future execution."""
    print(f"[Shared Tools] Enqueueing followup task for {execute_after_sec}s with payload {task_payload}")
    # In production: create Cloud Tasks request with schedule_time
    return "task_enqueued_successfully"

async def search_knowledge_base(db: AsyncSession, query: str) -> list:
    """Searches using pgvector setup previously."""
    # Instantiates the VectorStore adapter
    # from pgvector_store import CloudSQLPgVectorStore
    print(f"[Shared Tools] Searching Knowledge Base for: {query}")
    return [{"chunk": "Relevant data snippet"}]
