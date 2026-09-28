# Production Deployment Guide

**Target Environment:** Docker / Docker Compose / Linux Systemd / Bare Metal  
**Status:** Production  
**Default Ports:** Frontend: `3000` | Backend: `8000` | Ollama: `11434`

---

## 1. Environment Configuration (`.env`)

Create a production `.env` file at the root of the workspace:

```env
# Application Settings
APP_NAME="AI Chat Platform"
APP_VERSION="2.0.0"
APP_ENV="production"
DEBUG=false

# Server Binding
HOST="0.0.0.0"
PORT=8000
BACKEND_URL="http://localhost:8000"
CORS_ORIGINS=["http://localhost:3000", "http://127.0.0.1:3000", "https://chat.yourdomain.com"]

# Database Engine
DATABASE_URL="sqlite+aiosqlite:///data/app.db"

# Ollama Model Daemon
OLLAMA_BASE_URL="http://127.0.0.1:11434"
OLLAMA_DEFAULT_MODEL="qwen2.5:7b"
OLLAMA_TIMEOUT_SECONDS=60.0

# Storage & File Limits
UPLOAD_DIR="data/uploads"
VECTOR_DB_PATH="data/vector_db"
ARTIFACTS_PATH="data/artifacts"
WORKSPACE_ROOT="data/workspace"
MAX_UPLOAD_SIZE_BYTES=26214400  # 25 MB

# Agent Runtime Limits
MAX_AGENT_ITERATIONS=25
AGENT_TOKEN_BUDGET=64000
AGENT_TIME_BUDGET_SECONDS=300
AGENT_HUMAN_IN_THE_LOOP_ENABLED=true

# Python Tool Sandbox Limits
PYTHON_TOOL_ENABLED=true
PYTHON_TIMEOUT_SECONDS=15
PYTHON_MAX_MEMORY_MB=256
```

---

## 2. Docker Compose Deployment

Voltix includes a multi-container Docker Compose configuration ([docker-compose.yml](file:///e:/Projects/AI%20&%20ML/domain_specific_qa_system_project/voltix-1/docker-compose.yml)):

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    ports:
      - "8000:8000"
    environment:
      - HOST=0.0.0.0
      - PORT=8000
      - OLLAMA_BASE_URL=http://host.docker.internal:11434
    volumes:
      - ./data:/app/data
    extra_hosts:
      - "host.docker.internal:host-gateway"
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000/api
    depends_on:
      - backend
    restart: unless-stopped
```

### Starting the Containers:
```bash
docker compose up --build -d
```

---

## 3. Production Reverse Proxy Configuration (Nginx)

When deploying behind Nginx, **response buffering must be disabled** to support Server-Sent Events (SSE) token streaming.

```nginx
server {
    listen 80;
    server_name chat.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name chat.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/chat.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chat.yourdomain.com/privkey.pem;

    # Frontend Client
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API & SSE Streams
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Critical SSE Streaming Settings
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
        chunked_transfer_encoding on;
    }
}
```

---

## 4. Systemd Service Management (Bare Metal Linux)

### Backend Service (`/etc/systemd/system/voltix-backend.service`)
```ini
[Unit]
Description=Voltix FastAPI Backend Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/voltix-1
ExecStart=/home/ubuntu/voltix-1/.venv/bin/uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always
RestartSec=5
EnvironmentFile=/home/ubuntu/voltix-1/.env

[Install]
WantedBy=multi-user.target
```

### Enable & Start Services:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now voltix-backend
```
