# QRGate Multi-Agent Architecture

## Panoramica Sistema
Il sistema QRGate AI si affida a un'infrastruttura fully serverless su Google Cloud (Cloud Run, Workflows, Cloud SQL Serverless/Micro, Cloud Build).

## Layer Orchestrativo (Cloud Workflows)
- `agent-runner`: Un Google Cloud Workflows ciclico responsabile dell'orchestrazione.
  1. Trigger da evento Pub/Sub.
  2. Registrazione su DB.
  3. Fase di **Planning** via `GeminiPlanner` (Gemini 2.5 Pro).
  4. Esecuzione seriale dei tool validati.
  5. Sospensione per interazione umana (HITL).
  
## Tool & Execution Layer (Cloud Run)
- `tool-gateway`: Un servizio Python FastAPI unificato.
  - Genera piani tramite Gemini limitando allucinazioni (JSON validation).
  - Possiede un dispatcher dinamico configurato sui tool di `Outreach` e `Content`.
  - Attivazione *Idempotente* via DB.

## Persistence (Cloud SQL - pgvector)
Database PostgreSQL standard. Modulo `pgvector_store` utilizzato per l'hybrid search documentale prima di invocarne Vertex AI Vector Search (predisposto ma in standby per contenere i costi).
- Schema standardizzato: 13 tabelle (`agents`, `agent_runs`, `audit_log`, `embedding_index_meta` ecc.)

## Human-in-The-Loop (HITL) e Admin
- `web-admin`: Endpoint FastAPI e Dashboard UI protetta da token OIDC/Firebase.
- Gli stack operatori visualizzano il run agent (`approval_requests`) e offrono il verdetto bloccante/sbloccante.
