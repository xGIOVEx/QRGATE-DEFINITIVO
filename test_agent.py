import os
import uuid
from google.api_core.client_options import ClientOptions
from google.cloud import dialogflowcx_v3

PROJECT_ID = "qr-gate-489118"
LOCATION = "global"
# ID of the CEO Orchestrator agent
AGENT_ID = "f38d23bd-837d-4705-ad3d-d8b4bbe3b3b7" 

def test_agent():
    client_options = ClientOptions(api_endpoint=f"{LOCATION}-dialogflow.googleapis.com")
    session_client = dialogflowcx_v3.SessionsClient(client_options=client_options)
    
    session_id = str(uuid.uuid4())
    session_path = session_client.session_path(
        project=PROJECT_ID,
        location=LOCATION,
        agent=AGENT_ID,
        session=session_id,
    )

    text = "Ciao, qual è il tuo ruolo all'interno di QRGate e come pensi di aiutarmi a scalare in Europa?"
    print(f"User: {text}")

    text_input = dialogflowcx_v3.TextInput(text=text)
    query_input = dialogflowcx_v3.QueryInput(text=text_input, language_code="it")
    request = dialogflowcx_v3.DetectIntentRequest(
        session=session_path,
        query_input=query_input
    )

    try:
        response = session_client.detect_intent(request=request)
        response_text = " ".join([msg.text.text[0] for msg in response.query_result.response_messages if msg.text])
        print(f"CEO Orchestrator: {response_text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_agent()
