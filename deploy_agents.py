import os
from google.api_core.client_options import ClientOptions
from google.cloud import dialogflowcx_v3

PROJECT_ID = "qr-gate-489118"
LOCATION = "global"

# Read prompts
def read_prompt(filename):
    with open(f"agent_prompts/{filename}", "r") as f:
        content = f.read()
        return content.split("--------------------------------------------------")[2].strip()

AGENTS = [
    {
        "display_name": "QRGate CEO Orchestrator",
        "description": "Agente CEO Orchestrator - coordina tutti gli agenti AI di QRGate",
        "file": "01_ceo_orchestrator.txt"
    },
    {
        "display_name": "QRGate Outreach Agent",
        "description": "Outreach Agent - lead generation e qualifica",
        "file": "02_outreach_agent.txt"
    },
    {
        "display_name": "QRGate Content Agent",
        "description": "Content Agent - genera audioguide verificate",
        "file": "03_content_agent.txt"
    },
    {
        "display_name": "QRGate Customer Success Agent",
        "description": "Customer Success Agent - ritenzione, supporto e AI Concierge",
        "file": "04_customer_success.txt"
    },
    {
        "display_name": "QRGate Social Media Agent",
        "description": "Social Media Agent - inbound marketing, LinkedIn, IG, TikTok",
        "file": "05_social_media.txt"
    },
    {
        "display_name": "QRGate Analytics Agent",
        "description": "Analytics Agent - KPI tracking e investor readiness module",
        "file": "06_analytics.txt"
    },
    {
        "display_name": "QRGate Finance & Compliance Agent",
        "description": "Finance Agent - pagamenti Stripe, dynamic pricing e tax readiness",
        "file": "07_finance.txt"
    },
    {
        "display_name": "QRGate SEO & Organic Growth Agent",
        "description": "SEO Agent - venue programmatic SEO pages e articoli B2B",
        "file": "08_seo_organic.txt"
    },
    {
        "display_name": "QRGate Market Expansion Agent",
        "description": "Market Expansion Agent - market research B2B e traduzioni pitch",
        "file": "09_market_expansion.txt"
    },
    {
        "display_name": "QRGate Voice Closer Agent",
        "description": "Voice Closer Agent - live demos con ElevenLabs e closing calls",
        "file": "10_voice_closer.txt"
    },
    {
        "display_name": "QRGate Genesis Protocol (Meta-Agent)",
        "description": "Genesis Protocol Meta-Agent - human-in-the-loop e auto-creazione di nuovi agent",
        "file": "11_genesis_protocol.txt"
    }
]

def deploy_agents():
    client_options = ClientOptions(api_endpoint=f"{LOCATION}-dialogflow.googleapis.com")
    client = dialogflowcx_v3.AgentsClient(client_options=client_options)
    parent = f"projects/{PROJECT_ID}/locations/{LOCATION}"

    print(f"Deploying all 11 AI Agents to {parent}...")

    # Fetch existing agents to avoid ALREADY_EXISTS errors
    existing_agents_list = client.list_agents(parent=parent)
    existing_names = {a.display_name: a.name for a in existing_agents_list}

    for agent_data in AGENTS:
        try:
            instructions = read_prompt(agent_data["file"])
            
            if agent_data["display_name"] in existing_names:
                print(f"✅ Skipping {agent_data['display_name']} - Already exists")
                continue

            # Create a generative agent (Dialogflow CX with GenAI features)
            agent = dialogflowcx_v3.Agent(
                display_name=agent_data["display_name"],
                description=agent_data["description"],
                default_language_code="it",
                time_zone="Europe/Rome",
            )
            
            request = dialogflowcx_v3.CreateAgentRequest(
                parent=parent,
                agent=agent
            )
            
            response = client.create_agent(request=request)
            print(f"🚀 Created Agent: {response.display_name}")

        except Exception as e:
            print(f"❌ Error creating {agent_data['display_name']}: {e}")

if __name__ == "__main__":
    deploy_agents()
