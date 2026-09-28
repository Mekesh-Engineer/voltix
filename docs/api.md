# REST & OpenAPI Reference Documentation

**Base API Path:** `http://localhost:8000/api`  
**API Version:** `v1`  
**Interactive Docs (Swagger UI):** `http://localhost:8000/api/docs`  
**Alternative Docs (Redoc):** `http://localhost:8000/api/redoc`  
**OpenAPI JSON Schema:** `http://localhost:8000/api/openapi.json`

---

## 1. System & Health Endpoints

### `GET /api/health` or `GET /api/v1/health`
Returns system operational health, active database connectivity, and Ollama service availability.

**Response (200 OK):**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "services": {
    "database": true,
    "ollama": true
  }
}
```

---

## 2. Conversational & Agentic Streaming

### `POST /api/chat/stream`
Standard conversational streaming endpoint via Server-Sent Events (SSE).

**Request Body:**
```json
{
  "conversation_id": "optional-uuid",
  "message": "Calculate the eigenvalue of a 2x2 matrix and explain.",
  "model": "qwen2.5:7b",
  "provider": "ollama",
  "stream": true,
  "attachments": ["file-uuid-1"],
  "tools_enabled": true,
  "execution_profile": "balanced",
  "privacy_mode": "auto"
}
```

**Stream Event Sequence (`Content-Type: text/event-stream`):**
* `data: {"type": "status", "status": "Retrieving document context..."}`
* `data: {"type": "citations", "citations": [{"id": 1, "source": "[1] math.pdf", ...}]}`
* `data: {"type": "token", "content": "To calculate..."}`
* `data: {"type": "done", "message_id": "msg-123", "conversation_id": "conv-456", "title": "Matrix Eigenvalues"}`

---

### `POST /api/aetherion/chat`
Autonomous multi-agent orchestration endpoint with adaptive routing, tool execution, independent verification, and deliverable synthesis.

**Request Body:**
```json
{
  "message": "Analyze the financial CSV and generate a quarterly summary report.",
  "conversation_id": "conv-uuid",
  "model": "aetherion",
  "profile": "deep",
  "privacy_mode": "auto",
  "attachments": ["csv-file-uuid"],
  "tools_enabled": true
}
```

### `POST /api/aetherion/route/preview`
Inspects the dynamic routing decision (selected role, ensemble level, complexity score) without executing the task.

---

## 3. Autonomous Agent Management

### `POST /api/agent/run`
Executes an autonomous agent run, streaming granular lifecycle events (`AgentStarted`, `StepStarted`, `ToolCall`, `ToolResult`, `VerificationCompleted`, `AgentCompleted`).

### `POST /api/agent/pause`
Pauses an active agent run (`{"run_id": "run-uuid"}`).

### `POST /api/agent/resume`
Resumes a paused agent run (`{"run_id": "run-uuid"}`).

### `POST /api/agent/cancel`
Terminates an in-flight agent run (`{"run_id": "run-uuid"}`).

### `GET /api/agent/approvals/pending`
Lists all pending Human-in-the-Loop (HITL) approval requests.

### `POST /api/agent/approvals/{approval_id}/respond`
Submits an approval decision (`{"approval_id": "app-123", "approved": true}`).

---

## 4. Conversations & Threads

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/conversations` | List all conversation summaries ordered by pinned status and update time. |
| `POST` | `/api/conversations` | Create a new conversation thread. |
| `GET` | `/api/conversations/{id}` | Retrieve complete conversation detail with ordered message history and citations. |
| `PATCH` | `/api/conversations/{id}` | Update title, default model, or provider. |
| `DELETE` | `/api/conversations/{id}` | Permanently delete conversation and associated messages. |
| `POST` | `/api/conversations/{id}/pin` | Toggle pinned state (`{"is_pinned": true}`). |
| `POST` | `/api/conversations/{id}/branch` | Fork conversation from a specific message node. |
| `GET` | `/api/conversations/search?q={query}` | Search conversations and messages by keyword. |
| `GET` | `/api/conversations/{id}/export?format={markdown\|json}` | Export full transcript in Markdown or JSON format. |

---

## 5. Models & Fleet Discovery

### `GET /api/models`
Discovers all local Ollama models, cloud-bridged endpoints, context window capabilities, and daemon availability.

**Response:**
```json
{
  "models": [
    {
      "id": "aetherion",
      "name": "Voltix Aetherion (Adaptive Fleet)",
      "provider": "aetherion",
      "category": "Cloud",
      "context_window": 262144,
      "available": true,
      "icon_type": "ollama"
    },
    {
      "id": "qwen2.5:7b",
      "name": "qwen2.5:7b",
      "provider": "ollama",
      "category": "Local",
      "context_window": 32768,
      "available": true,
      "icon_type": "ollama"
    }
  ],
  "default_model": "aetherion",
  "default_provider": "aetherion",
  "ollama_status": true
}
```

### `GET /api/aetherion/models`
Returns the operational health and status of all seven specialized Aetherion model roles.

---

## 6. Document Ingestion & RAG

### `POST /api/files/upload`
Uploads a document (Multipart Form: `file: UploadFile`, `conversation_id?: string`).  
Supported formats: `.pdf`, `.docx`, `.txt`, `.md`, `.csv`, `.xlsx`, `.pptx`, `.json`, `.html`, `.py`, `.js`, `.ts`.  
Extracts text, generates chunks, and updates the persistent vector store.

### `GET /api/files`
Lists all uploaded files with byte sizes and timestamps.

### `GET /api/files/{id}/chunks`
Returns extracted text chunks and character boundaries for inspection.

### `DELETE /api/files/{id}`
Deletes uploaded file and prunes associated chunks from the vector database.

---

## 7. Autonomous Tool Ecosystem

### `GET /api/tools`
Lists all 17+ registered tools with descriptions, categories, risk classifications, and JSON input schemas.

---

## 8. Physical Artifacts

### `GET /api/artifacts`
Lists generated deliverables (Markdown reports, source files, CSVs) optionally filtered by `run_id`.

### `GET /api/artifacts/{artifact_id}/download`
Downloads the physical artifact binary/text file directly.

---

## 9. Asynchronous Tasks

### `GET /api/tasks`
Lists scheduled and completed background tasks.

### `POST /api/tasks`
Creates a new background task (`{"title": "...", "description": "...", "priority": "normal"}`).

---

## 10. User Settings & Preferences

### `GET /api/settings`
Returns active user settings (theme, default model, temperature, max tokens, RAG and tool toggles).

### `PATCH /api/settings`
Updates user configuration preferences.

---

## 11. Error Response Format (RFC 7807)

All API exceptions conform to the **RFC 7807 Problem Details** standard:

```json
{
  "type": "https://errors.voltix.ai/toolexecutionerror",
  "title": "ToolExecutionError",
  "status": 500,
  "detail": "Tool 'python' timed out after 15.0s.",
  "instance": "/api/chat/stream",
  "request_id": "a8f3b92c"
}
```
