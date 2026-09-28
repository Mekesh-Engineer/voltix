# Troubleshooting & Operations Runbook

**Target Audience:** DevOps Engineers, System Administrators, Developers  
**Status:** Production  
**Scope:** Root Cause Analysis, Common Diagnostics, Recovery Procedures

---

## 1. Quick Diagnostic Checklist

When experiencing issues, run the automated verification script:

```bash
npm run verify
```

This script verifies:
1. **FastAPI Backend**: `http://localhost:8000/api/health`
2. **SQLite Persistence**: Schema integrity of `data/app.db`
3. **Ollama Daemon**: Endpoint accessibility at `http://127.0.0.1:11434`
4. **Next.js Frontend**: Web server responsiveness at `http://localhost:3000`

---

## 2. Common Issues & Solutions

### 2.1 Ollama Daemon Connection Failures

**Symptoms:**
* The model indicator in the header displays **Offline** or **Fallback Active**.
* Chat responses are produced by the internal fallback assistant.

**Root Causes:**
* Ollama service is not running.
* Firewall or antivirus is blocking port `11434`.
* Docker container cannot reach host Ollama daemon.

**Resolution Steps:**
1. Check if Ollama is running locally:
   ```bash
   curl http://127.0.0.1:11434/api/tags
   ```
2. Start the daemon manually:
   ```bash
   ollama serve
   ```
3. If running via Docker Compose, verify `OLLAMA_BASE_URL` in `.env` is set to:
   ```env
   OLLAMA_BASE_URL=http://host.docker.internal:11434
   ```

---

### 2.2 Server-Sent Events (SSE) Stream Buffering or Freezing

**Symptoms:**
* Tokens do not appear incrementally in real time; the entire response arrives as a single block after a delay.
* The streaming connection drops after 60 seconds.

**Root Causes:**
* A reverse proxy (e.g., Nginx, Cloudflare, AWS ALB) is buffering HTTP responses.
* `proxy_read_timeout` is prematurely terminating long agentic runs.

**Resolution Steps:**
1. In Nginx, add the following directives to your `/api/` location block:
   ```nginx
   proxy_buffering off;
   proxy_cache off;
   proxy_read_timeout 600s;
   proxy_send_timeout 600s;
   chunked_transfer_encoding on;
   ```
2. Ensure the backend returns the header `X-Accel-Buffering: no` (included by default in `backend/app/chat/service.py`).

---

### 2.3 Python Sandbox Timeouts (`ToolExecutionError`)

**Symptoms:**
* Tool calls to `python` fail with the error message: `Tool 'python' timed out after 15.0s`.

**Root Causes:**
* The generated Python code contains an infinite loop, blocking I/O, or requires extensive computation exceeding the 15-second wall-clock ceiling.
* The script exceeded the 256 MB memory limit.

**Resolution Steps:**
1. Inspect the agent step diagnostics in the SlideOver Inspector to review the script source.
2. If executing long-running calculations, adjust timeout and memory ceilings in `.env`:
   ```env
   PYTHON_TIMEOUT_SECONDS=30
   PYTHON_MAX_MEMORY_MB=512
   ```
3. Restart the backend service.

---

### 2.4 SQLite Database Locked (`sqlite3.OperationalError: database is locked`)

**Symptoms:**
* API endpoints return HTTP 500 with `database is locked` error.

**Root Causes:**
* High concurrency writes on a shared SQLite file, or an unclosed transaction from a crashed process.

**Resolution Steps:**
1. Voltix uses `aiosqlite` with asynchronous transaction management and Write-Ahead Logging (WAL) enabled automatically on initialization.
2. Ensure no external GUI tools (e.g., DB Browser for SQLite) hold an exclusive write lock on `data/app.db`.
3. Restart the backend process to release any lingering file locks.

---

### 2.5 Vector Database Index Corruption or Stale Chunks

**Symptoms:**
* RAG search returns chunks from deleted documents, or `data/vector_db/index.json` fails JSON parsing.

**Resolution Steps:**
1. Re-index all uploaded documents by deleting the stale index file:
   ```bash
   # Windows PowerShell
   Remove-Item data\vector_db\index.json

   # Linux/macOS
   rm -f data/vector_db/index.json
   ```
2. Re-upload your documents through the UI or `POST /api/files/upload`. The vector store will automatically regenerate the index.

---

## 3. Structured Logging & Log Analysis

Voltix logs all HTTP requests, request correlation IDs, tool execution latencies, and agent state transitions in structured format:

```text
2026-09-26 21:45:09 [INFO] [a8f3b92c] START POST /api/aetherion/chat
2026-09-26 21:45:10 [INFO] [a8f3b92c] Aetherion Routing: Role=aetherion-fast, Profile=BALANCED, Intent=CODE_DEVELOPMENT
2026-09-26 21:45:11 [INFO] [a8f3b92c] Executing tool 'code.search' with args {'query': 'def parse_document'}
2026-09-26 21:45:11 [INFO] [a8f3b92c] Tool 'code.search' completed in 4.20ms (Success=True)
2026-09-26 21:45:12 [INFO] [a8f3b92c] Verification: Passed=True, Confidence=1.00
2026-09-26 21:45:14 [INFO] [a8f3b92c] DONE  POST /api/aetherion/chat -> 200 (4580.12ms)
```

To filter logs for a specific request, grep by the 8-character request ID:
```bash
grep "a8f3b92c" backend.log
```
