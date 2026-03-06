import os
from google.api_core.client_options import ClientOptions
from google.cloud import dialogflowcx_v3 as cx

PROJECT_ID = "qr-gate-489118"
LOCATION = "global"
AGENT_ID = "f38d23bd-837d-4705-ad3d-d8b4bbe3b3b7" # CEO Orchestrator

def inject_playbook():
    client_options = ClientOptions(api_endpoint=f"{LOCATION}-dialogflow.googleapis.com")
    
    # 1. Read prompt
    with open("agent_prompts/01_ceo_orchestrator.txt", "r") as f:
        content = f.read().split("--------------------------------------------------")[2].strip()

    # 2. Create Playbook
    pb_client = cx.PlaybooksClient(client_options=client_options)
    agent_msg = f"projects/{PROJECT_ID}/locations/{LOCATION}/agents/{AGENT_ID}"
    
    pb = cx.Playbook(
        display_name="Core Playbook",
        instruction=cx.Playbook.Instruction(
            steps=[cx.Playbook.Step(text=content)]
        ),
        goal="Coordinare autonomamente il team di QRGate."
    )
    
    request = cx.CreatePlaybookRequest(parent=agent_msg, playbook=pb)
    
    try:
        response = pb_client.create_playbook(request=request)
        print(f"✅ Created Playbook: {response.name}")
        
        # 3. Associate Playbook to Default Start Flow?
        # Actually in Vertex Agent builder, if an agent has NO playbooks it's a flow agent.
        # Once it has a playbook, is it considered a generative agent? Let's check!
    except Exception as e:
        print(f"❌ Error creating Playbook: {e}")

if __name__ == "__main__":
    inject_playbook()
