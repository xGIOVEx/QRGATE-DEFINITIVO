# Global Multi-Service Dockerfile
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
ENV WORKDIR=/app/agent_system

WORKDIR ${WORKDIR}

# Install dependencies required for async pg, vector etc
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy monorepo
COPY packages/ ./packages/
COPY services/ ./services/

# The exact service to run is passed via CMD at deployment 
# e.g. for tool_gateway: 
# CMD ["uvicorn", "services.tool_gateway.main:app", "--host", "0.0.0.0", "--port", "8080"]
# for web_admin:
# CMD ["uvicorn", "services.web_admin.main:app", "--host", "0.0.0.0", "--port", "8081"]
