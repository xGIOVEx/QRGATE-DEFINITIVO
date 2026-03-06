# Deviations from Blueprint / Original Approach

Durante l'esecuzione come technical owner, sono state prese decisioni specifiche e deviazioni mirate per assicurare che il sistema sia production-grade e rispettoso di tutti i vincoli esecutivi elencati nel Mandato:

1. **Abbandono dei Playbook nativi di Vertex AI**
   Nel blueprint iniziale e nello storico, si tentava di mappare gli agenti sui classici Playbook di Vertex AI. Tuttavia, i Playbook offrono scarso controllo sullo stato di persistenza (Cloud SQL) e sulle pause asincrone "Human-In-The-Loop" gestite a livello di database proprio. Abbiamo deviato verso **Cloud Workflows + Gemini Pro + Cloud Run Tool Gateway**, il che permette una granularità operativa assoluta per riprendere in sicurezza (`resume`) i processi approvati.

2. **Divergenza driver PostgreSQL (Mac Architecture / dev-environment)**
   La specifica per il backend in locale ha rivelato l'uso di Python 3.14. `psycopg2-binary` falliva il build dei wheel in C, per cui si è deviato sull'uso del driver nativo `psycopg[binary]` v3 o `asyncpg` puro per assicurare il caricamento del layer ORM SQLAlchemy e di pgvector.

3. **Inizializzazione Alembic**
   Per implementare il constraint "schema base obbligatorio", Alembic gestirà l'autogenerazione tramite la base ORM in `packages/db/alembic/env.py`. L'esecuzione della prima migrazione (`alembic upgrade head`) è lasciata alle pipeline CI per evitare l'esposizione della password del DB e la mutazione del master su console via Public IP. Sono previsti i pattern sicuri tramite Secret Manager.
