import os
from google.api_core.client_options import ClientOptions
from google.cloud import dialogflowcx_v3 as cx

PROJECT_ID = "qr-gate-489118"
LOCATION = "global"
AGENT_ID = "f38d23bd-837d-4705-ad3d-d8b4bbe3b3b7" # CEO Orchestrator

def inspect_agent():
    client_options = ClientOptions(api_endpoint=f"{LOCATION}-dialogflow.googleapis.com")
    
    agent_msg = f"projects/{PROJECT_ID}/locations/{LOCATION}/agents/{AGENT_ID}"
    
    # Check Playbooks
    pb_client = cx.PlaybooksClient(client_options=client_options)
    try:
        playbooks = pb_client.list_playbooks(parent=agent_msg)
        print("PLAYBOOKS:")
        for p in playbooks:
            print(p.display_name, p.name)
    except Exception as e:
        print("No playbooks or error:", e)

    # Check Flows
    flow_client = cx.FlowsClient(client_options=client_options)
    try:
        flows = flow_client.list_flows(parent=agent_msg)
        print("FLOWS:")
        for f in flows:
            print(f.display_name, f.name)
    except Exception as e:
        print("No flows or error:", e)

if __name__ == "__main__":
    inspect_agent()
