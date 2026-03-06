# QRGate Operational Runbook

## Deployment da zero

1. Posizionarsi in `agent_system/infra/terraform`
2. Eseguire `terraform init` e `terraform apply`
3. Posizionarsi in `agent_system` ed eseguire `gcloud builds submit --config=cloudbuild.yaml`
4. Spingere le migrazioni database:
   ```bash
   cd agent_system/packages/db
   source ../../venv/bin/activate
   alembic upgrade head
   ```

## Aggiunta di un nuovo Agente
1. Definire le logiche esecutive in `packages/agents/nuovo_agente_tools.py`
2. Registrare i function names nel dispatcher `services/tool_gateway/main.py`
3. Inserire il prompt core del nuovo Agente nel configuration loader/DB (`agents` table)

## Risoluzione problemi (Troubleshooting)
- **Workflows fallisce**: Controllare i log di `agent-runner` in Cloud Logging. Tipicamente errori di rete verso `tool-gateway`.
- **Database irreperibile**: Verificare configurazione IAM per accedere in Cloud SQL. In ambiente locale assicurarsi di utilizzare Cloud SQL Auth Proxy.
- **Agenti in loop**: Usare la dashboard HITL (`services/web_admin`) per forzare lo stato del run a `failed` nel caso l'idempotency fallisca o se le restrizioni (`max_steps_20`) non fossero intervenute in tempo.
- **Deployment fallisce su Artifact Registry**: Verificare di aver concesso i ruoli adeguati di "Artifact Registry Writer" e "Cloud Build Service Account" al progetto nativo build.
