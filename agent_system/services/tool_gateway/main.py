import os
import uuid
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field
import uvicorn
from contextlib import asynccontextmanager

# Dependency imports (assumes packages/db is in PYTHONPATH)
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + '/../../packages/db')
from database import get_db, AsyncSessionLocal
from sqlalchemy.ext.asyncio import AsyncSession
from models import AgentRun, AgentStep, ToolCallLog

app = FastAPI(title="QRGate Multi-Agent Tool Gateway", description="Central gateway for Workflows to interact with DB and Agents")

class StartRunRequest(BaseModel):
    run_id: str
    agent_id: str
    event_data: Dict[str, Any]

class PlanRequest(BaseModel):
    run_id: str
    agent_id: str

class ExecuteToolRequest(BaseModel):
    run_id: str
    agent_id: str
    tool: str
    args: Dict[str, Any]
    idempotency_key: str

@app.post("/api/v1/run/start")
async def start_run(req: StartRunRequest, db: AsyncSession = Depends(get_db)):
    """Registers a new agent run."""
    # Ensure agent exists to prevent Foreign Key Violation
    from models import Agent
    agent = await db.get(Agent, req.agent_id)
    if not agent:
        new_agent = Agent(
            id=req.agent_id,
            name=f"{req.agent_id} (Auto-created)",
            description=f"Auto-generated entry for {req.agent_id}",
            persona="Default persona"
        )
        db.add(new_agent)
        try:
            await db.commit()
        except:
            await db.rollback()
            
    new_run = AgentRun(id=req.run_id, agent_id=req.agent_id, status="running")
    db.add(new_run)
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "ok", "run_id": req.run_id}

@app.post("/api/v1/run/plan")
async def plan_run(req: PlanRequest, db: AsyncSession = Depends(get_db)):
    """Calls Gemini to generate the next steps for the agent."""
    # TODO: Implement Gemini reasoning. For now we return a dummy plan.
    # The actual implementation will live in packages/core/planner.py
    
    plan_result = {
        "status": "executing",
        "steps": [
            {
                "tool": "search_venues",
                "args": {"area": "Milan", "type": "Museum"},
                "idempotency_key": f"{req.run_id}-step-1"
            }
        ]
    }
    return plan_result

@app.post("/api/v1/tool/execute")
async def execute_tool(req: ExecuteToolRequest, db: AsyncSession = Depends(get_db)):
    """Executes a specific tool via dynamic dispatch."""
    # Log the tool call
    log = ToolCallLog(
        run_id=req.run_id,
        agent_id=req.agent_id,
        tool_name=req.tool,
        args=req.args
    )
    db.add(log)
    await db.commit()
    
    # TODO: dynamic dispatch to packages/agents tools
    # Example execution
    result_data = {"venues_found": ["Pinacoteca di Brera"]}
    
    log.result = str(result_data)
    await db.commit()
    
    return {"status": "success", "result": result_data}

@app.post("/api/v1/run/complete")
async def complete_run(req: PlanRequest, db: AsyncSession = Depends(get_db)):
    """Marks run as complete."""
    run = await db.get(AgentRun, req.run_id)
    if run:
        run.status = "completed"
        await db.commit()
    return {"status": "ok"}

@app.post("/api/v1/run/fail")
async def fail_run(req: PlanRequest, db: AsyncSession = Depends(get_db)):
    """Marks run as failed and logs reason."""
    run = await db.get(AgentRun, req.run_id)
    if run:
        run.status = "failed"
        await db.commit()
        # Publish to DLQ
    return {"status": "ok"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
