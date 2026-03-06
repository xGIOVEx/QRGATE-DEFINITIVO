import json
from typing import List, Literal, Optional, Any, Dict
from pydantic import BaseModel, Field, field_validator
from google import genai
from google.genai import types

class AgentStepPlan(BaseModel):
    step_type: Literal["tool", "hitl", "note", "complete"] = Field(description="The type of action to take.")
    tool: Optional[str] = Field(None, description="The name of the tool to call, if step_type is 'tool'")
    args: Optional[Dict[str, Any]] = Field(None, description="Arguments for the tool")
    idempotency_key: str = Field(description="A unique idempotency key for this exact operation")
    note_text: Optional[str] = Field(None, description="Internal reasoning or notes, if step_type is 'note'")

class AgentPlanResult(BaseModel):
    goal: str = Field(description="The overarching goal this plan is trying to achieve")
    steps: List[AgentStepPlan] = Field(description="List of steps to execute in this batch (max 20)")
    constraints: List[str] = Field(description="Any active constraints or assertions for this iteration")

    @field_validator('steps')
    @classmethod
    def check_steps_limit(cls, v: List[AgentStepPlan]) -> List[AgentStepPlan]:
        if len(v) > 20:
            raise ValueError("Too many steps in a single plan batch (max 20).")
        return v

class PlanStatusResponse(BaseModel):
    status: Literal["executing", "requires_hitl", "complete", "failed"]
    plan: Optional[AgentPlanResult] = None
    reason: Optional[str] = None

class GeminiPlanner:
    def __init__(self, project_id: str, location: str = "europe-west1"):
        # Relies on Application Default Credentials or explicit API key
        self.client = genai.Client(http_options={'api_version': 'v1alpha'})
        self.model_name = 'gemini-2.5-pro' # Latest standard for top level reasoning
        
    def generate_plan(self, agent_prompt: str, context_memory: dict, current_state: dict) -> PlanStatusResponse:
        system_instruction = f"""
        You are an elite reasoning agent. You MUST adhere to your agent prompt below.
        
        AGENT PROMPT:
        {agent_prompt}
        
        Your job is to produce a valid JSON plan.
        You can return multiple steps to be executed sequentially.
        If you need human approval, yield a step with step_type="hitl".
        If you are done, yield step_type="complete".
        """
        
        user_prompt = f"""
        # Current Context:
        {json.dumps(context_memory, indent=2)}
        
        # Current State / Last Results:
        {json.dumps(current_state, indent=2)}
        
        What is your next action plan? Respond only with the required JSON schema.
        """
        
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    response_schema=AgentPlanResult.model_json_schema(),
                    temperature=0.2
                ),
            )
            raw_json = response.text
            plan_obj = AgentPlanResult.model_validate_json(raw_json)
            
            status = "executing"
            for step in plan_obj.steps:
                if step.step_type == "hitl":
                    status = "requires_hitl"
                    break
                elif step.step_type == "complete":
                    status = "complete"
                    
            return PlanStatusResponse(status=status, plan=plan_obj)
            
        except Exception as e:
            # Handle fail / retry upstream
            return PlanStatusResponse(status="failed", reason=str(e))
