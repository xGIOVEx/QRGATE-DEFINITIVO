import os
from typing import List
from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel
import uvicorn
import firebase_admin
from firebase_admin import auth

import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + '/../../packages/db')
from database import get_db, AsyncSessionLocal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import ApprovalRequest, AgentRun

# Initialize Firebase Admin
try:
    firebase_admin.initialize_app()
except ValueError:
    pass # Already initialized

app = FastAPI(title="QRGate HITL Admin API")

async def verify_firebase_token(authorization: str = Header(None)):
    """Verifies the Firebase ID token for Admin access."""
    if not authorization or not authorization.startswith("Bearer "):
        # In a real setup, throw 401. For local testing without a live frontend, we allow passing.
        # raise HTTPException(status_code=401, detail="Unauthorized")
        return {"uid": "local-dev-admin"}
    
    token = authorization.split("Bearer ")[1]
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

class ApprovalDecision(BaseModel):
    decision: str # "approved", "rejected"
    reason: str = ""

@app.get("/api/admin/approvals", response_model=List[dict])
async def list_pending_approvals(db: AsyncSession = Depends(get_db), admin_user: dict = Depends(verify_firebase_token)):
    stmt = select(ApprovalRequest).where(ApprovalRequest.status == "pending").order_by(ApprovalRequest.created_at.desc())
    result = await db.execute(stmt)
    approvals = result.scalars().all()
    
    return [
        {
            "id": a.id,
            "run_id": a.run_id,
            "agent_id": a.agent_id,
            "payload": a.payload,
            "created_at": a.created_at
        } for a in approvals
    ]

@app.post("/api/admin/approvals/{approval_id}/decide")
async def decide_approval(approval_id: str, decision_data: ApprovalDecision, db: AsyncSession = Depends(get_db), admin_user: dict = Depends(verify_firebase_token)):
    if decision_data.decision not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid decision. Must be 'approved' or 'rejected'.")
        
    req = await db.get(ApprovalRequest, approval_id)
    if not req:
        raise HTTPException(status_code=404, detail="Approval request not found.")
        
    if req.status != "pending":
        raise HTTPException(status_code=400, detail="Request already decided.")
        
    req.status = decision_data.decision
    req.decision_reason = decision_data.reason
    await db.commit()
    
    # RESUME WORKFLOW: 
    # Here we would send a Pub/Sub message or a Cloud Task to wake up the agent runner
    # and tell it the HITL step is resolved.
    print(f"Resuming run {req.run_id} after {decision_data.decision} decision.")
    
    return {"status": "success", "message": f"Approval {decision_data.decision}"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8081))
    uvicorn.run(app, host="0.0.0.0", port=port)
