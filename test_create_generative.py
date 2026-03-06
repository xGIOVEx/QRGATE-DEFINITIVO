import os
from google.api_core.client_options import ClientOptions
from google.cloud import dialogflowcx_v3 as cx

PROJECT_ID = "qr-gate-489118"
LOCATION = "global"

def create_true_generative_agent():
    client_options = ClientOptions(api_endpoint=f"{LOCATION}-dialogflow.googleapis.com")
    agent_client = cx.AgentsClient(client_options=client_options)
    pb_client = cx.PlaybooksClient(client_options=client_options)
    parent = f"projects/{PROJECT_ID}/locations/{LOCATION}"

    print("1. Creating the base Agent...")
    agent = cx.Agent(
        display_name="Test GenAI Agent 002",
        description="A truly generative agent built via code.",
        default_language_code="it",
        time_zone="Europe/Rome",
    )
    
    created_agent = agent_client.create_agent(
        request=cx.CreateAgentRequest(parent=parent, agent=agent)
    )
    print(f"Agent created: {created_agent.name}")

    print("2. Creating the Default Playbook with Instructions...")
    pb = cx.Playbook(
        display_name="Default Start Playbook",
        instruction=cx.Playbook.Instruction(
            steps=[cx.Playbook.Step(text="Sei un assistente di test. Rispondi in modo conciso e simpatico.")]
        ),
        goal="Aiutare l'utente nei test."
    )
    created_pb = pb_client.create_playbook(
        request=cx.CreatePlaybookRequest(parent=created_agent.name, playbook=pb)
    )
    print(f"Playbook created: {created_pb.name}")

    print("3. Updating Agent to set start_playbook...")
    created_agent.start_playbook = created_pb.name
    updated_agent = agent_client.update_agent(
        request=cx.UpdateAgentRequest(
            agent=created_agent,
            update_mask={"paths": ["start_playbook"]}
        )
    )
    print("Done! The agent is now a Generative Agent.")

if __name__ == "__main__":
    create_true_generative_agent()
