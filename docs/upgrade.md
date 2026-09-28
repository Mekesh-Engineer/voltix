# Voltix-1: Production Upgrade Specification & Architecture Blueprint

**Target Artifact:** `upgrade.md`  
**Version:** 2.0.0  
**Status:** Approved for Implementation  
**Target Environment:** Next.js 16.3.6 (App Router) | React 19.2.8 | FastAPI 0.115+ | SQLAlchemy 2.0 (Async) | SQLite / aiosqlite | Tailwind CSS v4

---

## 1. Executive Summary & Target System Architecture

### 1.1 Architectural Vision

Voltix-1 is evolving from a functional chat prototype into a robust, high-performance, enterprise-grade AI platform. The target system provides a unified runtime for both local open-weights models executed via Ollama (`llama3.2`, `mistral`, `deepseek-r1:8b`) and frontier cloud APIs (OpenAI `gpt-4o`, Google `gemini-1.5-pro/flash`, Anthropic `claude-3-5-sonnet`).

The platform's core architecture centers around four production pillars:

1. **Autonomous Multi-Step Agentic Tooling**: Native integration of safe mathematical AST evaluation and isolated Python execution via sandboxed multiprocessing child processes.
2. **Hybrid Retrieval-Augmented Generation (RAG)**: Ingestion of enterprise document formats (PDF, DOCX, XLSX, PPTX, CSV, HTML, source code) paired with semantic chunking, subword trigram indexing, vector ranking, and an interactive source-inspection slide-over.
3. **Conversation Intelligence**: Tree-based non-destructive conversation branching (forking), pinned sessions, server-side full-text search, and multi-format session export (Markdown, JSON).
4. **Resilient Reactive Interface**: Built on Next.js 16.3.6 and React 19, featuring an accessible 3-tier application shell, context window budget monitoring, a global `Cmd+K` command palette, and subtle micro-animations respecting user accessibility preferences.

### 1.2 Target System Architecture Diagram

```text
+───────────────────────────────────────────────────────────────────────────────────────────────+
|                                  VOLTIX-1 APPLICATION SHELL                                  |
+─────────────────────────────────┬──────────────────────────────────┬──────────────────────────+
| COLLAPSIBLE SIDEBAR             | MAIN CHAT WORKSPACE              | INSPECTOR SLIDE-OVER     |
| - Brand & Session Controls      | - Model Selector & Status Bar    | - Cited Source Inspector |
| - Global Search (Cmd+K)         | - Context Window Capacity Meter  | - Document Chunk Viewer  |
| - Pinned Conversations          | - Streaming Activity Accordion   | - Tool I/O Log Viewer    |
| - Date-Grouped History Tree     | - Message Feed (Markdown+KaTeX)  | - Model Latency Monitor  |
| - User Profile & Settings       | - Slash Command Composer (/)     |                          |
+─────────────────────────────────┴──────────────────────────────────┴──────────────────────────+
                                                  │ SSE Streams / JSON REST
                                                  ▼
+───────────────────────────────────────────────────────────────────────────────────────────────+
|                                      FASTAPI BACKEND CORE                                     |
+──────────────────────────┬─────────────────────────────┬──────────────────────────────────────+
| ORCHESTRATION & ROUTING  | RAG & KNOWLEDGE BASE        | TOOL RUNTIME SANDBOX                 |
| - LLMRouter (Ollama,     | - Multi-Format Parser       | - AST Math Evaluator (Safe)          |
|   OpenAI, Gemini, Claude)| - Hierarchical Chunker      | - Multiprocessing Python Sandbox     |
| - Fallback Provider      | - Hybrid Vector Store       | - ToolRegistry Dispatcher            |
| - Sliding-Window Memory  | - Security Context Wrapper  |                                      |
+──────────────────────────┴─────────────────────────────┴──────────────────────────────────────+
                                                  │ Async SQLAlchemy 2.0
                                                  ▼
+───────────────────────────────────────────────────────────────────────────────────────────────+
|                                PERSISTENCE & STORAGE (SQLite / FS)                            |
| - app.db (Conversations, Messages with Branching Trees, Files, UserSettings)                  |
| - data/uploads (Raw user attachments) | data/vector_db (Inverted index & sparse vectors)      |
+───────────────────────────────────────────────────────────────────────────────────────────────+
```

---

## 2. Target Project Directory Structure

```text
voltix-1/
├── Dockerfile                              # Multi-stage production container for Next.js 16
├── docker-compose.yml                      # Container orchestration (frontend, backend, persistence)
├── package.json                            # Frontend dependencies (Next 16, React 19, Tailwind v4)
├── tsconfig.json                           # TypeScript 5 target configuration with "@/ *" path alias
├── next.config.ts                          # Next.js build and optimization settings
├── postcss.config.mjs                      # Tailwind CSS PostCSS plugin integration
├── eslint.config.mjs                       # Flat ESLint configuration
├── types/
│   ├── chat.ts                             # ChatMessage, CitationItem, StreamingEvent, ToolCallEvent
│   ├── conversation.ts                     # Conversation, ConversationBranch, ConversationGroup
│   ├── file.ts                             # FileInfo, UserSettings, DocumentChunk
│   └── model.ts                            # ModelInfo, ModelListResponse, ProviderHealth
├── lib/
│   ├── api.ts                              # Standardized client API SDK with error normalization
│   ├── storage.ts                          # LocalStorage abstraction with typed schema validation
│   ├── streaming.ts                        # Robust SSE parser with backpressure and chunk buffering
│   └── utils.ts                            # Class merge (cn), clipboard, date grouping, token estimation
├── hooks/
│   ├── useChat.ts                          # Main chat state machine, branching, and streaming lifecycle
│   ├── useConversations.ts                 # Conversation management, optimistic updates, pinning
│   ├── useFileUpload.ts                    # Drag-and-drop, validation, progress, and indexing
│   ├── useModels.ts                        # Model discovery, Ollama active probing, fallback detection
│   └── useCommandPalette.ts                # Global keyboard shortcuts (Cmd+K, /, Escape)
├── components/
│   ├── ui/
│   │   ├── Icons.tsx                       # Brand logos, model providers, and operational badges
│   │   ├── Badge.tsx                       # Status and model capability indicators
│   │   ├── Progress.tsx                    # Context window capacity bar and upload progress
│   │   ├── Tooltip.tsx                     # Accessible keyboard shortcut tooltips
│   │   └── Modal.tsx                       # Accessible modal wrapper with focus trapping
│   ├── layout/
│   │   ├── AppShell.tsx                    # Responsive 3-tier layout container
│   │   ├── Header.tsx                      # Top bar with model picker, health pill, and context meter
│   │   └── SlideOver.tsx                   # Right-side drawer for sources and tool inspection
│   ├── sidebar/
│   │   ├── Sidebar.tsx                     # Main navigation sidebar with collapse/minify transitions
│   │   ├── NewChatButton.tsx               # Primary chat initiation button
│   │   ├── SearchChats.tsx                 # Search trigger button with keyboard hint
│   │   ├── ConversationItem.tsx            # Tree item with inline rename, pin, and branch menu
│   │   └── ConversationList.tsx            # Pinned section followed by date-grouped history
│   ├── chat/
│   │   ├── ChatWorkspace.tsx               # Main message viewport and scroll management
│   │   ├── EmptyState.tsx                  # Persona selection and categorized prompt cards
│   │   ├── MessageList.tsx                 # Virtualized/memoized list of user and assistant turns
│   │   ├── MessageItem.tsx                 # Message card with branch selector, retry, and copy
│   │   ├── ActivityTimeline.tsx            # Visual stepper for RAG retrieval and tool executions
│   │   ├── ContextMeter.tsx                # Context budget visualization bar
│   │   └── ScrollToBottom.tsx              # Floating indicator button with new-token alert
│   ├── composer/
│   │   ├── Composer.tsx                    # Multi-line expanding composer with drag-and-drop
│   │   ├── SlashMenu.tsx                   # Popover menu for quick actions (/model, /calc, /python)
│   │   ├── AttachmentStrip.tsx             # Attached files strip with upload progress indicators
│   │   └── DropOverlay.tsx                 # Viewport-wide drag-and-drop illumination overlay
│   ├── sources/
│   │   ├── SourceList.tsx                  # Expandable citation tags with relevance scores
│   │   └── SourceInspector.tsx             # Slide-over pane showing highlighted chunk in document
│   ├── markdown/
│   │   ├── MarkdownRenderer.tsx            # ReactMarkdown with remark-gfm, KaTeX, and table plugins
│   │   ├── CodeBlock.tsx                   # Fenced code block with language badge, copy, and runner
│   │   └── TableRenderer.tsx               # Responsive table container with CSV export trigger
│   ├── command/
│   │   └── CommandPalette.tsx              # Cmd+K modal for chats, models, actions, and settings
│   └── settings/
│       └── SettingsPanel.tsx               # Tabbed settings dialog (General, AI, Memory, Tools)
├── app/
│   ├── layout.tsx                          # Root layout with Geist fonts and theme provider
│   ├── page.tsx                            # Core Chat Workspace route
│   ├── studio/
│   │   └── page.tsx                        # Dual-model comparison and benchmark arena
│   ├── globals.css                         # Tailwind CSS v4 variables and typography tokens
│   └── error.tsx                           # Global error boundary with recovery action
└── backend/
    ├── Dockerfile                          # Python 3.11-slim container with Uvicorn runner
    ├── requirements.txt                    # Pinned production dependencies
    ├── pytest.ini                          # Async test runner configuration
    ├── tests/
    │   ├── test_health.py                  # Database and Ollama heartbeat tests
    │   ├── test_conversations.py           # Lifecycle and branching CRUD tests
    │   ├── test_chat.py                    # Streaming SSE event flow and persistence tests
    │   ├── test_rag.py                     # Document parsing, chunking, and search accuracy
    │   └── test_tools.py                   # AST math safety and Python sandbox constraints
    └── app/
        ├── config.py                       # Pydantic BaseSettings, directory paths, and limits
        ├── main.py                         # FastAPI setup, CORS, lifespan, request ID middleware
        ├── api/
        │   ├── router.py                   # Central APIRouter mounting all sub-routes under `/api`
        │   ├── health.py                   # Latency-aware health and readiness checks
        │   ├── chat.py                     # Streaming SSE chat and export endpoints
        │   ├── conversations.py            # Conversation and branching management endpoints
        │   ├── models.py                   # Model discovery, testing, and benchmark endpoints
        │   ├── files.py                    # Multipart upload, indexing, and management endpoints
        │   └── settings.py                 # System and user configuration endpoints
        ├── core/
        │   ├── exceptions.py               # Complete custom exception hierarchy
        │   ├── logging.py                  # Structured JSON logger with credential sanitization
        │   └── security.py                 # Filename validation, path traversal guard, context jail
        ├── database/
        │   ├── database.py                 # Async SQLAlchemy engine and session dependency
        │   └── models.py                   # Relational models (Conversation, Message, File, Settings)
        ├── schemas/
        │   ├── chat.py                     # Pydantic schemas for requests, citations, and SSE events
        │   ├── conversation.py             # Conversation schemas (Create, Branch, Summary, Detail)
        │   ├── file.py                     # File upload, chunk inspection, and index responses
        │   └── model.py                    # Model capabilities and benchmark response schemas
        ├── llm/
        │   ├── base.py                     # Abstract base class `LLMProvider`
        │   ├── ollama.py                   # Ollama local client with timeout and model probing
        │   ├── openai.py                   # OpenAI client with SSE streaming
        │   ├── gemini.py                   # Google Gemini client with SSE streaming
        │   ├── anthropic.py                # Claude Messages client with streaming deltas
        │   ├── fallback.py                 # Offline fallback assistant with contextual templates
        │   └── router.py                   # Multi-provider routing, retry logic, and fallback
        ├── memory/
        │   └── conversation.py             # Context window tracking, sliding window, and summarization
        ├── rag/
        │   ├── parser.py                   # Document extraction (PDF, DOCX, XLSX, PPTX, CSV, HTML)
        │   ├── chunker.py                  # Recursive character chunker with overlap and ID hashes
        │   ├── embeddings.py               # Sparse subword trigram vectorizer + Ollama dense embeddings
        │   ├── vector_store.py             # In-memory cached vector store with disk persistence
        │   └── retriever.py                # Top-K retrieval, citation ranking, and prompt encapsulation
        ├── tools/
        │   ├── registry.py                 # Central tool registry with parameter validation
        │   ├── calculator.py               # Safe AST mathematical evaluator
        │   ├── python.py                   # Sandboxed multiprocessing Python runner
        │   └── agent.py                    # Autonomous tool execution loop for chat streaming
        └── files/
            └── service.py                  # Storage orchestration, validation, and RAG trigger
```

---

## 3. Deep System Areas: 12-Point Upgrade Specifications

### Area 1: Frontend Architecture & Component Scaffolding

**Current State:**  
The frontend is built on Next.js 16.3.6 and React 19.2.8. `app/page.tsx` is an overgrown file holding state, layout, subcomponents, and chat views simultaneously.

**Problems / Gaps:**  
Lack of layout decomposition; z-index collisions among drawers and modals; missing virtualization for large threads; non-standardized keyboard listeners.

**Target State:**  
A structured, 3-tier responsive shell (`AppShell`) separating the Sidebar, Main Stage, and SlideOver Inspector. Clear atomic hierarchy with standardized modals using React 19 portals.

**Proposed Improvements:**

- Decompose `app/page.tsx` into modular layout and feature components (`AppShell`, `Header`, `ChatWorkspace`, `SlideOver`).
- Introduce a slide-over drawer for source citations and tool execution traces.
- Centralize modals and global keyboard navigation via a Command Palette (`Cmd+K`).

#### Implementation Details

Create `components/layout/AppShell.tsx`:

```typescript
export function AppShell({
  sidebar,
  header,
  children,
  slideOver,
  isSlideOverOpen,
}: AppShellProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-stone-100 dark:bg-neutral-950 font-sans antialiased">
      {sidebar}
      <div className="flex flex-1 flex-col overflow-hidden">
        {header}
        <main className="relative flex flex-1 overflow-hidden">{children}</main>
      </div>
      {isSlideOverOpen && slideOver}
    </div>
  );
}
```

**Dependencies:** `lucide-react`, React 19 standard hooks.  
**UI/UX Changes:** Clean visual partitioning with dividers (`border-stone-200/70 dark:border-neutral-800`), responsive off-canvas mobile drawer, slide-over desktop panel.  
**Technical Considerations:** Avoid hydration mismatches by wrapping storage and theme reads in an initial `useEffect` synchronization lifecycle.  
**Priority:** `High`

**Acceptance Criteria:**

- [ ] `app/page.tsx` contains fewer than 80 lines of declarative code.
- [ ] Opening the slide-over drawer causes no horizontal overflow or layout jitter.
- [ ] Lighthouse Accessibility score >= 95.

---

### Area 2: Backend Architecture & API Structure

**Current State:**  
FastAPI app in `backend/app/` with routers in `app/api/`. Async SQLite persistence via SQLAlchemy 2.0. Single-file synchronous vector persistence (`index.json`).

**Problems / Gaps:**  
File locks on concurrent JSON vector database updates; unversioned API routes; casing discrepancies in settings payloads (`ollamaBaseUrl` vs `ollama_base_url`).

**Target State:**  
Cleanly versioned `/api/v1` routes with connection pooling, in-memory vector cache with atomic temporary file swapping, and RFC 7807 problem details.

**Proposed Improvements:**

- Map endpoints under `/api/v1` while preserving backward-compatible `/api` aliases.
- Standardize all schemas to strict `snake_case` in Pydantic.
- Add dedicated conversation branching, export, and model diagnostic endpoints.

#### Implementation Details

Standardize RFC 7807 error format in `backend/app/core/exceptions.py`:

```python
class ProblemDetails(BaseModel):
    type: str
    title: str
    status: int
    detail: str
    instance: str
    request_id: str
```

Add connection pooling parameters in `backend/app/database/database.py`:

```python
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_size=10,
    max_overflow=20,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)
```

**Dependencies:** `fastapi>=0.115.0`, `uvicorn[standard]>=0.30.0`, `pydantic>=2.9.0`, `sqlalchemy>=2.0.32`, `aiosqlite>=0.20.0`.  
**UI/UX Changes:** Backend request tracking displays active request ID on error toasts.  
**Technical Considerations:** Ensure SQLite write transactions are short-lived to prevent database concurrency timeouts.  
**Priority:** `Critical`

**Acceptance Criteria:**

- [ ] 20 parallel async requests execute without database lock errors.
- [ ] All endpoints return validated Pydantic schemas documented at `/api/docs`.

---

### Area 3: AI / LLM Orchestration & Multi-Provider Routing

**Current State:**  
`LLMProvider` abstract base class implemented by Ollama, OpenAI, Gemini, Anthropic, and Fallback providers. Router resolves provider by string substring checks.

**Problems / Gaps:**  
Fragile substring matching; missing retry mechanism with exponential backoff on cloud rate limits; no cancellation propagation when user disconnects streaming.

**Target State:**  
Registry-driven `LLMRouter` with dynamic model discovery, capability flags, backoff retries, request disconnection listeners, and automatic graceful degradation.

**Proposed Improvements:**

- Explicit `ModelRegistry` mapping model IDs to provider instances.
- Jittered exponential backoff for HTTP 429/503 errors (maximum 2 retries).
- Integrate `request.is_disconnected()` in the chat stream to cancel upstream LLM requests on client abort.

#### Implementation Details

Enhance `LLMRouter.route_stream` in `backend/app/llm/router.py`:

```python
async def route_stream(self, messages, model=None, provider_name=None, temperature=0.7, max_tokens=None):
    provider = self.resolve_provider(model=model, provider_name=provider_name)
    attempts = 0
    while attempts <= 2:
        try:
            async for token in provider.stream(messages, model=model, temperature=temperature, max_tokens=max_tokens):
                yield token
            return
        except (httpx.ConnectError, httpx.TimeoutException, OllamaUnavailableError) as exc:
            attempts += 1
            if attempts > 2:
                logger.warning(f"Provider {provider.name} failed ({exc}). Falling back to Assistant.")
                yield f"\n\n> [!WARNING]\n> **Primary model unavailable**: {str(exc)}. Switched to built-in Assistant.\n\n"
                async for token in self.providers["assistant"].stream(messages, model="general-assistant"):
                    yield token
                return
            await asyncio.sleep(0.5 * attempts)
```

**Dependencies:** `httpx>=0.27.0`.  
**UI/UX Changes:** Model selector categorized into Local Engines, Cloud Intelligence, and Resilient Fallback, with real-time green/amber/gray status beacons.  
**Technical Considerations:** Cleanly terminate async generators using `try...finally` to ensure network sockets close when clients abort.  
**Priority:** `Critical`

**Acceptance Criteria:**

- [ ] Disconnecting client stops backend generation within 200ms.
- [ ] Terminating Ollama daemon automatically diverts stream to Fallback Assistant with user warning.

---

### Area 4: Real-Time Streaming & Interaction Loop

**Current State:**  
SSE stream parsed with `TextDecoder` and string line buffering. Events: `token`, `citations`, `status`, `done`, `error`.

**Problems / Gaps:**  
Status events overwrite one another without history; streaming token insertion causes visual layout jitter; abrupt scroll snapping when user reads previous messages.

**Target State:**  
Smooth buffered streaming loop featuring an `ActivityTimeline` stepper, frame-rate stabilized token rendering, and a smart scroll lock with a floating 'new content' button.

**Proposed Improvements:**

- Add SSE events: `tool_call`, `metrics`.
- Create `ActivityTimeline.tsx` displaying completed and in-progress operational steps.
- Add smart scroll anchor: user scrolling up > 100px unpins auto-scroll and displays a floating 'Scroll to Latest' indicator with an animated badge.

#### Implementation Details

Define enhanced event contract in `types/chat.ts`:

```typescript
export type StreamingEvent =
  | {
      type: "status";
      status: string;
      stage?: "rag" | "tool" | "reasoning" | "llm";
    }
  | { type: "token"; content: string }
  | { type: "citations"; citations: CitationItem[] }
  | {
      type: "tool_call";
      tool: string;
      input: Record<string, any>;
      output?: string;
      duration_ms?: number;
    }
  | {
      type: "metrics";
      time_to_first_token_ms: number;
      total_tokens: number;
      tokens_per_sec: number;
    }
  | {
      type: "done";
      message_id: string;
      conversation_id: string;
      title?: string;
    }
  | { type: "error"; message: string };
```

**Dependencies:** Native browser `ReadableStream`.  
**UI/UX Changes:** Animated shimmering pulse indicator during pre-token latency; smooth token reveal transitions (opacity: 0 -> 1 over 40ms).  
**Technical Considerations:** Batch token state updates with `requestAnimationFrame` if incoming stream chunks exceed 60 tokens per second.  
**Priority:** `High`

**Acceptance Criteria:**

- [ ] Time-to-first-token metric is recorded and visible in the message inspector.
- [ ] Manual scrolling upward prevents automated scroll snap until the floating button is clicked.

---

### Area 5: Autonomous Tool Calling & Execution Sandboxing

**Current State:**  
AST calculator (`calculator.py`) evaluates arithmetic expressions safely. Sandboxed Python multiprocessing runner (`python.py`) exists but is never invoked from chat. Triggering is hardcoded to `message.startswith("calculate ")`.

**Problems / Gaps:**  
User must remember specific syntax commands; Python execution tool is dead code; multi-step tool interactions cannot occur autonomously.

**Target State:**  
An `AgentOrchestrator` execution loop. Natural language queries automatically trigger parameter extraction, tool execution, context reinjection, and verified synthesis.

**Proposed Improvements:**

- Implement `backend/app/tools/agent.py` supporting an autonomous agent execution loop (maximum 3 iterations).
- Emit `tool_call` SSE events displaying interactive tool cards in the chat UI.
- Support slash commands in composer (`/calc <expr>`, `/python <code>`) for explicit invocation.

#### Implementation Details

Create agent loop in `backend/app/tools/agent.py`:

```python
class AgentOrchestrator:
    async def run_tool_loop(self, messages, tools_enabled=True):
        if not tools_enabled:
            return None
        last_user_msg = messages[-1]["content"]
        calc_match = re.search(r"(?:evaluate|calculate|compute|\/calc)\s+([0-9\.\+\-\*\/\^\(\)\s\w]+)", last_user_msg, re.IGNORECASE)
        if calc_match:
            expr = calc_match.group(1).strip()
            start = time.time()
            res = await tool_registry.execute("calculator", expression=expr)
            duration = round((time.time() - start) * 1000, 2)
            return {
                "type": "tool_call",
                "tool": "calculator",
                "input": {"expression": expr},
                "output": str(res),
                "duration_ms": duration
            }
        return None
```

**Dependencies:** Python standard libraries `ast`, `multiprocessing`.  
**UI/UX Changes:** Inline tool execution cards show execution status, duration pill (12ms), expandable expression input, and verified numeric output.  
**Technical Considerations:** Strict process timeout (5s) and memory caps (128MB) for Python worker child processes to prevent denial-of-service.  
**Priority:** `High`

**Acceptance Criteria:**

- [ ] Prompting "Compute sqrt(256) \* 18.5" triggers tool execution, emits `tool_call` event, and outputs `296.0`.
- [ ] Malicious Python attempts (e.g. `import os`) are blocked with a security exception.

---

### Area 6: RAG, Document Processing & Knowledge Base

**Current State:**  
`parser.py` extracts text from PDF, DOCX, CSV, XLSX, PPTX, HTML, and code files. `chunker.py` divides text into 1000-char blocks with 200-char overlap. `embeddings.py` uses sparse subword trigrams. `vector_store.py` writes to `index.json`.

**Problems / Gaps:**  
Large documents block the async event loop during parsing; vector index writes are non-atomic; users cannot view the full document context surrounding a cited snippet.

**Target State:**  
Non-blocking threaded document parsing (`asyncio.to_thread`), atomic `.tmp` vector index file replacement, hybrid search (Ollama dense embeddings when available + sparse trigram fallback), and an interactive Source Inspector drawer.

**Proposed Improvements:**

- Wrap synchronous parsers in `asyncio.to_thread`.
- Implement atomic file replacement in `VectorStore._save()`.
- Create `SourceInspector.tsx` frontend drawer that displays document name, relevance score, and the complete text chunk with search matches highlighted.

#### Implementation Details

Atomic file persistence in `backend/app/rag/vector_store.py`:

```python
def _save(self):
    temp_file = self.index_file.with_suffix(".tmp")
    try:
        temp_file.write_text(json.dumps(self.records, indent=2), encoding="utf-8")
        temp_file.replace(self.index_file)
    except Exception as e:
        logger.error(f"Failed to persist vector index atomically: {e}")
        if temp_file.exists():
            temp_file.unlink()
```

**Dependencies:** `pypdf>=4.3.0`, `python-docx>=1.1.2`, `openpyxl>=3.1.5`, `python-pptx>=1.0.1`, `beautifulsoup4>=4.12.3`.  
**UI/UX Changes:** Citation badges `[1] Report.pdf (92% match)`. Clicking opens the `SlideOver` drawer displaying the full chunk with a copy button.  
**Technical Considerations:** Strip null bytes (`\x00`) from parsed document strings before SQLite storage.  
**Priority:** `High`

**Acceptance Criteria:**

- [ ] Ingesting a multi-page PDF does not freeze or delay simultaneous chat streams.
- [ ] Clicking a source badge opens the `SlideOver` inspector showing highlighted context within 100ms.

---

### Area 7: Conversation Management, Branching & State Persistence

**Current State:**  
Conversations stored in SQLite with title, model, timestamps. Linear message stream without branching or pinning support.

**Problems / Gaps:**  
Editing an earlier prompt destroys subsequent turns or creates disjointed logs; no ability to pin important conversations; search is limited to client-side titles.

**Target State:**  
Non-destructive conversation branching (forking), pinned sessions displayed at top of the sidebar, server-side title and content search, and conversation exporting (Markdown, JSON).

**Proposed Improvements:**

- Add `parent_id` column to `messages` table and `is_pinned` column to `conversations` table.
- Add branch creation endpoint `POST /api/v1/conversations/{id}/branch`.
- Add export endpoint `GET /api/v1/conversations/{id}/export?format=markdown`.
- Add Pin/Unpin actions to conversation menu.

#### Implementation Details

Update `backend/app/database/models.py`:

```python
class Conversation(Base):
    # ...
    is_pinned = Column(Boolean, default=False, nullable=False)

class Message(Base):
    # ...
    parent_id = Column(String(36), ForeignKey("messages.id", ondelete="SET NULL"), nullable=True)
    branch_index = Column(Integer, default=0, nullable=False)
```

**Dependencies:** `sqlalchemy>=2.0.32`, `aiosqlite>=0.20.0`.  
**UI/UX Changes:** Pinned conversations grouped under a dedicated top section. Message action bar includes 'Branch from here', updating message turns to `< 1 of 2 >`.  
**Technical Considerations:** Use indexed parent-pointer queries to reconstruct historical branches efficiently without deep recursive joins.  
**Priority:** `Medium`

**Acceptance Criteria:**

- [ ] Pinned conversations stay at top of the sidebar across page reloads.
- [ ] Branching at message 2 creates a new conversation fork containing turns 1-2 with independent subsequent history.

---

### Area 8: Settings, Secrets & Runtime Configuration

**Current State:**  
Single `user_settings` row in SQLite. `SettingsPanel.tsx` allows entering API keys, Ollama URL, and hyperparameters.

**Problems / Gaps:**  
API keys displayed in plain text without visibility toggles; runtime updates modify settings object in memory only; casing mismatch (`ollama_base_url` vs `ollamaBaseUrl`); no connection test button.

**Target State:**  
Standardized `snake_case` settings schema, masked password inputs with visibility toggles, live connection diagnostic probes, and safe database persistence.

**Proposed Improvements:**

- Normalize all keys to `snake_case` across frontend SDK and backend endpoints.
- Add 'Test Connection' button for each provider in settings hitting `POST /api/v1/models/test`.
- Never return raw API keys in GET requests; return boolean flags (`has_openai_key`).

#### Implementation Details

Standardize schema in `backend/app/schemas/settings.py`:

```python
class SettingsUpdateSchema(BaseModel):
    theme: Optional[str] = None
    default_model: Optional[str] = None
    default_provider: Optional[str] = None
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, ge=256, le=32768)
    memory_enabled: Optional[bool] = None
    rag_enabled: Optional[bool] = None
    tools_enabled: Optional[bool] = None
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    ollama_base_url: Optional[str] = None
```

**Dependencies:** `pydantic-settings>=2.4.0`.  
**UI/UX Changes:** Provider cards with password masking toggles and instant 'Test' diagnostic triggers returning green checkmarks or error reasons.  
**Technical Considerations:** Prevent accidental secret leakage by auto-sanitizing keys in logging middleware.  
**Priority:** `High`

**Acceptance Criteria:**

- [ ] Updating Ollama URL immediately reflects in model discovery without restarting FastAPI.
- [ ] Browser DevTools inspection reveals no plain-text API secrets in network response payloads.

---

### Area 9: UI/UX Modernization, Interaction Design & Micro-Animations

**Current State:**  
Standard Tailwind utility styles. Basic text loading states ('Thinking...'). Abrupt element appearances.

**Problems / Gaps:**  
Blank initial screen on new chats; abrupt token and citation pop-in; code blocks lack run buttons or line numbers.

**Target State:**  
Futuristic interface featuring an `EmptyState` capability grid, subtle entrance animations, token streaming glow, accessible tooltips, and rich code blocks.

**Proposed Improvements:**

- Build `EmptyState.tsx` with 4 capability starter cards (Coding, Math, Documents, Reasoning).
- Add message appearance animations (`translate-y-1` -> `translate-y-0`, opacity: 0 -> 1 over 150ms).
- Code block enhancements: syntax highlighting tag, copy confirmation, and line numbers.

#### Implementation Details

Define animation utility in `app/globals.css`:

```css
@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-message {
  animation: messageSlideIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@media (prefers-reduced-motion: reduce) {
  .animate-message {
    animation: none;
  }
}
```

**Dependencies:** `Tailwind CSS v4`, `lucide-react`.  
**UI/UX Changes:** Subtle pulsating glow on local model pill during active inference; glassmorphism hover action toolbar on assistant message cards.  
**Technical Considerations:** Honor `@media (prefers-reduced-motion: reduce)` globally to maintain accessibility compliance.  
**Priority:** `Medium`

**Acceptance Criteria:**

- [ ] Clicking an empty-state card populates the composer and focuses the input.
- [ ] Animations disable completely when operating in reduced-motion mode.

---

### Area 10: Security, Sanitization & Defense-in-Depth

**Current State:**  
Basic filename regex sanitization; 25MB file upload limit; RAG context wrapped in `<retrieved_context>` tags; string matching in Python tool.

**Problems / Gaps:**  
Python string filtering can be bypassed via `getattr(__builtins__, ...)` reflection; HTML files could contain raw `<script>` tags; CORS includes wildcard `*` alongside origins.

**Target State:**  
Hardened Python sandbox removing code execution builtins, strict HTML tag stripping, tight origin-specific CORS policies, and prompt-injection-resistant context encapsulation.

**Proposed Improvements:**

- Disallow wildcard `*` in CORS when credentials are enabled.
- Strip `<script>`, `<style>`, and `<iframe>` elements from parsed HTML files using BeautifulSoup.
- Strip `__import__`, `eval`, `exec`, and `compile` from Python sandboxed globals completely.

#### Implementation Details

Lock down CORS in `backend/app/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin for origin in settings.CORS_ORIGINS if origin != "*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
```

Harden Python execution environment in `backend/app/tools/python.py`:

```python
safe_globals = {
    "__builtins__": {
        k: v for k, v in safe_builtins.items() if k not in ("__import__", "eval", "exec", "compile", "open")
    }
}
```

**Dependencies:** Python standard library built-ins.  
**UI/UX Changes:** Visual security warnings when uploaded documents contain macros or script elements.  
**Technical Considerations:** Context tags explicitly instructed in `GENERAL_SYSTEM_PROMPT` to be treated strictly as untrusted data reference.  
**Priority:** `Critical`

**Acceptance Criteria:**

- [ ] Path traversal filenames (`../../etc/passwd`) are sanitized to `file_etc_passwd`.
- [ ] Attempting dynamic imports in the Python runner raises a sandboxing permission error.

---

### Area 11: Performance Optimization & Context Budgeting

**Current State:**  
Sliding window memory stores the last 12 messages. No token estimation or context window tracking exists in the frontend.

**Problems / Gaps:**  
Long conversations exceed the context capacity of local models (e.g. 8,192 tokens on `llama3.2`), resulting in abrupt truncation or crashes.

**Target State:**  
Real-time context budget tracking in the header (`ContextMeter`), automated conversation summarization when history exceeds 75% of context window, and cached vector indexing.

**Proposed Improvements:**

- Client-side character-ratio token estimator (`approximateTokens = charCount / 4`).
- Visual capacity meter bar in header displaying percentage of model's `context_window` consumed.
- Background summarization of early conversation turns when token budget approaches capacity.

#### Implementation Details

Create `components/chat/ContextMeter.tsx`:

```typescript
export function ContextMeter({ currentTokens, maxTokens }: { currentTokens: number; maxTokens: number }) {
  const percentage = Math.min(Math.round((currentTokens / maxTokens) * 100), 100);
  const isWarning = percentage > 80;
  return (
    <div className="flex items-center gap-2 text-xs font-mono" title={`${currentTokens} / ${maxTokens} estimated tokens`}>
      <div className="w-16 h-1.5 bg-stone-200 dark:bg-neutral-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${isWarning ? "bg-amber-500" : "bg-blue-500"}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-[11px] text-stone-500 dark:text-neutral-400">{percentage}%</span>
    </div>
  );
}
```

**Dependencies:** Lightweight client heuristics.  
**UI/UX Changes:** Compact progress indicator in header with tooltip breakdown: `System: 350 | Docs: 1,200 | History: 2,100 | Remaining: 4,542`.  
**Technical Considerations:** Avoid loading heavy WASM tokenizers on client; use character heuristics for UI and exact counts in backend metadata.  
**Priority:** `Medium`

**Acceptance Criteria:**

- [ ] Context meter updates dynamically as user enters text and attaches documents.
- [ ] Long sessions (30+ turns) continue operating without context-overflow errors.

---

### Area 12: Testing, Quality Assurance & Developer Experience

**Current State:**  
Unit tests exist under `backend/tests/` for health, conversations, chat stream, and calculator. No frontend automated testing or RAG pipeline tests.

**Problems / Gaps:**  
No RAG extraction tests across file types; missing end-to-end integration tests; no standardized multi-container development environment.

**Target State:**  
Fully automated CI test matrix: backend unit and async integration tests with pytest, RAG parsing validation, and a turnkey `docker-compose.yml` configuration.

**Proposed Improvements:**

- Add `backend/tests/test_rag.py` verifying chunking overlap and sparse embedding similarity.
- Add end-to-end flow test: Create conversation -> Upload file -> Query with RAG context -> Verify citations -> Delete.
- Provide a clean `docker-compose.yml` for local multi-service testing.

#### Implementation Details

Create `backend/tests/test_rag.py`:

```python
import pytest
from backend.app.rag.chunker import chunk_text
from backend.app.rag.embeddings import embeddings_service

def test_chunker_overlap():
    text = "Sentence one. Sentence two. Sentence three. Sentence four." * 50
    chunks = chunk_text(text, chunk_size=200, chunk_overlap=50)
    assert len(chunks) > 1
    assert chunks[0].index == 0
    assert "chunk_id" in chunks[0].metadata

def test_sparse_embeddings_similarity():
    vec1 = embeddings_service.compute_sparse_vector("quantum computing algorithm")
    vec2 = embeddings_service.compute_sparse_vector("quantum computer algorithms")
    vec3 = embeddings_service.compute_sparse_vector("sourdough baking bread")
    sim_related = embeddings_service.cosine_similarity(vec1, vec2)
    sim_unrelated = embeddings_service.cosine_similarity(vec1, vec3)
    assert sim_related > sim_unrelated
    assert sim_related > 0.5
```

**Dependencies:** `pytest>=8.3.0`, `pytest-asyncio>=0.24.0`, `httpx>=0.27.0`.  
**UI/UX Changes:** None.  
**Technical Considerations:** Tests use isolated in-memory SQLite database configurations to leave local `app.db` untouched.  
**Priority:** `High`

**Acceptance Criteria:**

- [ ] pytest passes all test suites with 0 errors.
- [ ] `npm run lint` and `npm run build` execute cleanly with 0 type errors.

---

## 4. Complete API Contracts

### 4.1 Chat Streaming Endpoint

- **Route:** `POST /api/v1/chat/stream`
- **Request Payload:**

```json
{
  "conversation_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "message": "Calculate the projected ROI based on the attached spreadsheet.",
  "model": "llama3.2",
  "provider": "ollama",
  "stream": true,
  "attachments": ["f47ac10b-58cc-4372-a567-0e02b2c3d479"],
  "tools_enabled": true
}
```

- **Response Event Stream (`text/event-stream`):**

```text
data: {"type": "status", "status": "Searching attached documents...", "stage": "rag"}

data: {"type": "citations", "citations": [{"id": 1, "source": "[1] Q3_Report.xlsx", "filename": "Q3_Report.xlsx", "snippet": "Net revenue: $1,450,000 | Operational Cost: $820,000", "score": 0.892}]}

data: {"type": "status", "status": "Executing calculation...", "stage": "tool"}

data: {"type": "tool_call", "tool": "calculator", "input": {"expression": "(1450000 - 820000) / 820000 * 100"}, "output": "76.829", "duration_ms": 14.2}

data: {"type": "token", "content": "Based"}
data: {"type": "token", "content": " on"}
data: {"type": "token", "content": " the"}
data: {"type": "token", "content": " attached"}
data: {"type": "token", "content": " data,"}
data: {"type": "token", "content": " your"}
data: {"type": "token", "content": " ROI"}
data: {"type": "token", "content": " is"}
data: {"type": "token", "content": " **76.83%**."}

data: {"type": "metrics", "time_to_first_token_ms": 412, "total_tokens": 18, "tokens_per_sec": 38.4}

data: {"type": "done", "message_id": "msg_01h2x4z", "conversation_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", "title": "Projected ROI Calculation"}
```

### 4.2 Conversation Branching Endpoint

- **Route:** `POST /api/v1/conversations/{id}/branch`
- **Request Payload:**

```json
{
  "fork_from_message_id": "msg_01h2x4y"
}
```

- **Response Payload (`application/json`):**

```json
{
  "id": "c73a8912-11e2-45e0-91c6-4d2a1b9c7821",
  "title": "Projected ROI Calculation (Branch)",
  "parent_conversation_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "model": "llama3.2",
  "provider": "ollama",
  "created_at": "2026-09-24T05:45:00Z",
  "updated_at": "2026-09-24T05:45:00Z",
  "messages": [
    {
      "id": "msg_01h2x4w",
      "conversation_id": "c73a8912-11e2-45e0-91c6-4d2a1b9c7821",
      "role": "user",
      "content": "What was our total revenue in Q3?",
      "metadata": null,
      "created_at": "2026-09-24T05:40:00Z"
    },
    {
      "id": "msg_01h2x4y",
      "conversation_id": "c73a8912-11e2-45e0-91c6-4d2a1b9c7821",
      "role": "assistant",
      "content": "Total revenue in Q3 was $1,450,000.",
      "metadata": { "citations": [] },
      "created_at": "2026-09-24T05:40:02Z"
    }
  ]
}
```

### 4.3 Model Connectivity Test Endpoint

- **Route:** `POST /api/v1/models/test`
- **Request Payload:**

```json
{
  "provider": "ollama",
  "base_url": "http://localhost:11434"
}
```

- **Response Payload (`application/json`):**

```json
{
  "status": "online",
  "provider": "ollama",
  "latency_ms": 18.5,
  "available_models": ["llama3.2:latest", "mistral:latest", "deepseek-r1:8b"],
  "details": "Successfully connected to Ollama daemon."
}
```

---

## 5. Implementation Roadmap & Execution Order

```text
[Phase 1: Backend Foundation & API Standardization]
  │  - Database schema evolution (parent_id, is_pinned)
  │  - Standardization to /api/v1 with snake_case validation
  │  - In-memory vector store cache with atomic disk persistence
  ▼
[Phase 2: Agentic Tools & RAG Pipeline Enhancement]
  │  - Agent orchestrator loop for autonomous tool execution
  │  - Sandboxed Python child process hardening
  │  - Document parser threading with async I/O
  ▼
[Phase 3: Frontend Scaffolding & 3-Tier Layout]
  │  - AppShell, Header, Sidebar, and SlideOver component separation
  │  - Command Palette (Cmd+K) implementation
  │  - Context budget meter & health pill integration
  ▼
[Phase 4: Message Workspace & Interaction Polish]
  │  - ActivityTimeline execution stepper
  │  - Slash command popover (/calc, /python, /model)
  │  - SourceInspector slide-over drawer
  │  - Conversation branching and pinning UI
  ▼
[Phase 5: Studio Arena, Testing & Production Hardening]
  │  - Dedicated /studio comparison route
  │  - Pytest expansion (test_rag.py, test_tools.py)
  │  - Docker compose multi-container orchestration
  │  - Final verification against Definition of Done
```

### Detailed Phase Tasks

#### Phase 1: Backend Foundation & API Standardization

- Update `backend/app/database/models.py` with `is_pinned` in `Conversation` and `parent_id` in `Message`.
- Normalize settings schema parameters to strict `snake_case` in `backend/app/schemas/settings.py` and `backend/app/api/settings.py`.
- Update `VectorStore` in `backend/app/rag/vector_store.py` to use in-memory records and atomic temporary file swapping.
- Mount routes under `/api/v1` in `backend/app/api/router.py`.

#### Phase 2: Agentic Tools & RAG Pipeline Enhancement

- Implement `AgentOrchestrator` in `backend/app/tools/agent.py` to intercept tool intents and execute handlers.
- Update `ChatService.stream_chat` in `backend/app/chat/service.py` to emit `tool_call` and `status` SSE events.
- Wrap `parse_document` calls in `asyncio.to_thread` within `backend/app/files/service.py`.
- Run `pytest tests/test_tools.py` and verify all tests pass.

#### Phase 3: Frontend Scaffolding & 3-Tier Layout

- Refactor `app/page.tsx` into `AppShell.tsx`, `Header.tsx`, `ChatWorkspace.tsx`, and `SlideOver.tsx`.
- Implement `CommandPalette.tsx` bound to `Cmd+K` and `/` hotkeys.
- Build `ContextMeter.tsx` and integrate it into `Header.tsx`.
- Add the backend connectivity beacon component displaying database and Ollama availability.

#### Phase 4: Message Workspace & Interaction Polish

- Create `ActivityTimeline.tsx` to display real-time execution steps.
- Build `Composer.tsx` with slash command menu (`SlashMenu.tsx`) and drag-and-drop file overlay (`DropOverlay.tsx`).
- Build `SourceInspector.tsx` inside the slide-over drawer for interactive citation viewing.
- Wire conversation pinning and branching actions into `ConversationItem.tsx` and `MessageItem.tsx`.

#### Phase 5: Studio Arena, Testing & Production Hardening

- Implement `/studio` model comparison page running dual parallel streams with metrics cards.
- Create `backend/tests/test_rag.py` and execute full pytest suite.
- Configure `docker-compose.yml` for unified local execution.
- Execute full verification checklist and audit against acceptance criteria.

---

## 6. Verification Checklist & Definition of Done

### Verification Matrix

| Area                   | Verification Task                    | Expected Result                                                             | Pass/Fail |
| :--------------------- | :----------------------------------- | :-------------------------------------------------------------------------- | :-------: |
| **API Health**         | Query `GET /api/health`              | Returns status 200, database connected, Ollama probe status                 |    [ ]    |
| **Chat Stream**        | Stream prompt to `general-assistant` | Emits token, status, and done events with valid SSE formatting              |    [ ]    |
| **Ollama Local**       | Select `llama3.2` with Ollama active | Streams local tokens smoothly with green status beacon                      |    [ ]    |
| **Resilient Fallback** | Stop Ollama process and send chat    | Emits warning notice, falls back to assistant without dropping connection   |    [ ]    |
| **Tool Execution**     | Send "Calculate sqrt(144) + 25 \* 4" | Triggers calculator tool, displays tool card (112.0), output verified       |    [ ]    |
| **RAG Ingestion**      | Upload PDF file and query contents   | Parses text, creates vector chunks, returns cited snippets in source drawer |    [ ]    |
| **Source Inspector**   | Click citation badge on message      | Slide-over drawer opens displaying exact cited chunk and relevance score    |    [ ]    |
| **Branching**          | Click "Branch" on message turn 2     | Creates independent conversation fork retaining turns 1 and 2               |    [ ]    |
| **Pinning**            | Toggle "Pin" on conversation         | Moves conversation to pinned section at top of sidebar; persists on refresh |    [ ]    |
| **Command Palette**    | Press `Cmd+K` or `Ctrl+K`            | Command modal opens; typing model name switches active model                |    [ ]    |
| **Context Meter**      | Attach 3 files and type message      | Capacity bar updates estimated token usage and percentage                   |    [ ]    |
| **Studio Arena**       | Open `/studio` and run dual query    | Both models stream in parallel with TTFT and TPS metrics displayed          |    [ ]    |
| **Mobile Drawer**      | View on mobile viewport (< 768px)    | Sidebar collapses off-canvas; hamburger button toggles drawer smoothly      |    [ ]    |
| **Accessibility**      | Navigate entire app via keyboard     | Tab rings visible, modals trap focus, Escape closes overlays                |    [ ]    |

### Definition of Done

- **Zero Hydration or Console Errors**: Frontend launches cleanly with zero warnings or hydration errors in developer console.
- **Type Safety**: TypeScript compiler (`tsc --noEmit`) passes with 0 errors across all frontend modules.
- **Lint Quality**: ESLint passes cleanly with standard Next.js core web vitals rules.
- **Backend Test Coverage**: Pytest executes with 100% passing rate across all unit, tool, and RAG test suites.
- **No Regressions**: Existing working capabilities (Markdown rendering, KaTeX math, file storage, SSE stream parsing) are preserved and upgraded without loss of functionality.
- **Container Readiness**: Application builds and launches cleanly via Docker and Docker Compose.
