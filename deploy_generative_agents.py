import os
from google.api_core.client_options import ClientOptions
from google.cloud import dialogflowcx_v3 as cx

PROJECT_ID = "qr-gate-489118"
LOCATION = "global"

AGENTS = [
    {"display_name": "QRGate CEO Orchestrator", "file": "01_ceo_orchestrator.txt"},
    {"display_name": "QRGate Outreach Agent", "file": "02_outreach_agent.txt"},
    {"display_name": "QRGate Content Agent", "file": "03_content_agent.txt"},
    {"display_name": "QRGate Customer Success Agent", "file": "04_customer_success.txt"},
    {"display_name": "QRGate Social Media Agent", "file": "05_social_media.txt"},
    {"display_name": "QRGate Analytics Agent", "file": "06_analytics.txt"},
    {"display_name": "QRGate Finance & Compliance Agent", "file": "07_finance.txt"},
    {"display_name": "QRGate SEO & Organic Growth Agent", "file": "08_seo_organic.txt"},
    {"display_name": "QRGate Market Expansion Agent", "file": "09_market_expansion.txt"},
    {"display_name": "QRGate Voice Closer Agent", "file": "10_voice_closer.txt"},
    {"display_name": "QRGate Genesis Protocol (Meta-Agent)", "file": "11_genesis_protocol.txt"}
]

def read_prompt(filename):
    with open(f"agent_prompts/{filename}", "r") as f:
        content = f.read()
        return content.split("--------------------------------------------------")[2].strip()

def deploy_true_generative_agents():
    client_options = ClientOptions(api_endpoint=f"{LOCATION}-dialogflow.googleapis.com")
    agent_client = cx.AgentsClient(client_options=client_options)
    pb_client = cx.PlaybooksClient(client_options=client_options)
    parent = f"projects/{PROJECT_ID}/locations/{LOCATION}"

    print("Fetching existing agents to clean up old Flow-based versions...")
    existing_agents = agent_client.list_agents(parent=parent)
    
    # 1. DELETE EXISTING AGENTS TO AVOID ALREADY_EXISTS AND ENSURE CLEAN SLATE
    target_names = [a["display_name"] for a in AGENTS]
    for agent in existing_agents:
        if agent.display_name in target_names or agent.display_name.startswith("Test GenAI"):
            print(f"🗑️ Deleting old agent: {agent.display_name}...")
            try:
                agent_client.delete_agent(name=agent.name)
            except Exception as e:
                print(f"Could not delete {agent.display_name}: {e}")

    # 2. CREATE NEW GENERATIVE AGENTS (PLAYBOOK NATIVE)
    for agent_data in AGENTS:
        display_name = agent_data["display_name"]
        print(f"\n🚀 Deploying {display_name}...")
        
        try:
            instructions = read_prompt(agent_data["file"])
            
            # Create bare agent
            agent_obj = cx.Agent(
                display_name=display_name,
                default_language_code="it",
                time_zone="Europe/Rome"
            )
            created_agent = agent_client.create_agent(
                request=cx.CreateAgentRequest(parent=parent, agent=agent_obj)
            )
            print("  ✅ Base Agent created.")

            # Create generative Playbook
            pb = cx.Playbook(
                display_name=display_name + " Playbook",
                instruction=cx.Playbook.Instruction(
                    steps=[cx.Playbook.Step(text=instructions)]
                ),
                goal=f"Operare come {display_name} per il team di QRGate."
            )
            created_pb = pb_client.create_playbook(
                request=cx.CreatePlaybookRequest(parent=created_agent.name, playbook=pb)
            )
            print("  ✅ Generative Playbook created and attached.")

            # Set as default start playbook to officially make it a Vertex "Generative Agent"
            created_agent.start_playbook = created_pb.name
            agent_client.update_agent(
                request=cx.UpdateAgentRequest(
                    agent=created_agent,
                    update_mask={"paths": ["start_playbook"]}
                )
            )
            print("  ✅ Marked as Native Vertex Generative Agent.")
            
        except Exception as e:
            print(f"❌ Failed to deploy {display_name}: {e}")

if __name__ == "__main__":
    deploy_true_generative_agents()
