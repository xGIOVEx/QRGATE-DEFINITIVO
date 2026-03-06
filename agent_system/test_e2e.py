import json
import base64
import subprocess
import time

# Event payload simulating a Cron Scheduler triggering the Outreach Agent
event_data = {
    "agent_id": "outreach-agent",
    "event_type": "scheduled_run",
    "timestamp": time.time()
}

json_bytes = json.dumps(event_data).encode("utf-8")
base64_payload = base64.b64encode(json_bytes).decode("utf-8")

workflow_args = json.dumps({
    "message": {
        "data": base64_payload
    }
})

print(f"Executing End-to-End Workflow test on 'agent-runner'...")

cmd = [
    "gcloud", "workflows", "run", "agent-runner",
    "--location=europe-west1",
    "--data", workflow_args,
    "--format=json"
]

try:
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    out = json.loads(result.stdout)
    print("\n[E2E TEST RESULT]")
    print(f"Execution ID: {out.get('name')}")
    print(f"State: {out.get('state')}")
    print(f"Result: {out.get('result')}")
    
except subprocess.CalledProcessError as e:
    print("Workflow execution failed!")
    print(e.stderr)
