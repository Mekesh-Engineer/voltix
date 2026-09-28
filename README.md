# Voltix — Enterprise Agentic AI Chatbot Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](file:///e:/Projects/AI%20&%20ML/domain_specific_qa_system_project/voltix-1/LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.3.6-black)](file:///e:/Projects/AI%20&%20ML/domain_specific_qa_system_project/voltix-1/frontend)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](file:///e:/Projects/AI%20&%20ML/domain_specific_qa_system_project/voltix-1/backend)
[![Ollama](https://img.shields.io/badge/Ollama-Fleet-orange.svg)](https://ollama.com)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-CSS_v4-38B2AC.svg)](https://tailwindcss.com)

**Voltix** is a production-grade, full-stack **Agentic AI Chatbot Platform** powered by the **Aetherion** autonomous agent runtime. It unifies local on-device quantized models and cloud-accelerated endpoints via an asynchronous Ollama daemon bridge, features an enterprise 17-tool ecosystem with child-process sandboxing and AST math evaluation, executes multi-format Retrieval-Augmented Generation (RAG), and delivers an interactive Next.js 16 interface with a Model Comparison Studio, Context Budget Meter, and SlideOver Activity Inspector.

---

## Key Capabilities

* **Aetherion Autonomous Agent Runtime**:
  * **Adaptive Model Routing**: Intelligently routes tasks based on intent and complexity across specialized roles (`aetherion-ultra`, `aetherion-super`, `aetherion-nano`, `aetherion-reason`, `aetherion-vision`, `aetherion-fast`, `aetherion-mini`).
  * **Configurable Execution Profiles**: `FAST`, `BALANCED`, `DEEP`, and `MAX` ensemble levels (`level_0_direct` to `level_4_max`).
  * **Hierarchical Planning & Subagents**: Dynamic goal decomposition, parallel subagent swarms, and runtime replanning.
  * **Independent Verification Engine**: Multi-metric verification passes that validate tool claims, calculations, citations, and generated artifacts before user delivery.
  * **Human-in-the-Loop (HITL)**: Granular authorization gates with risk ratings (`LOW`, `MEDIUM`, `HIGH`, `IRREVERSIBLE`) and interactive confirmation modals.
* **17+ Autonomous Tool Ecosystem**:
  * **Safe AST Math Calculator**: AST-parsed arithmetic and symbolic trigonometry with zero `eval()` usage.
  * **Isolated Python Sandbox**: Multiprocessing child-process execution with memory limits (256 MB) and strict timeouts (15s).
  * **Web & Live Research**: Search, page extraction, and recursive web research tools.
  * **Filesystem & Code Intelligence**: Sandboxed file read/write, code search, diff generation, and automated test runners.
  * **Database & Memory**: Read-only SQL schema inspection, vector search, and persistent cross-session memory.
  * **Artifact Synthesis**: Physical report, code snippet, and structured data generation.
* **Hybrid Retrieval-Augmented Generation (RAG)**:
  * Ingests and parses **PDF**, **DOCX**, **TXT**, **MD**, **CSV**, **XLSX**, **PPTX**, and **HTML**.
  * Recursive chunking with token overlap, hybrid vector indexing, and cosine similarity ranking.
  * Strict XML boundary encapsulation (`<retrieved_context>`) to eliminate prompt-injection attacks.
* **Modern Reactive Web UI (Next.js 16 + React 19 + Preline AI Chat)**:
  * **Model Comparison Studio** (`/studio`): Side-by-side prompt execution, latency (TTFT), and throughput (TPS) benchmarking.
  * **Live Context Budget Meter**: Real-time context capacity visualizer preventing model context overflows.
  * **SlideOver Inspector**: Interactive drawer inspecting citations, raw document chunks, and tool execution traces.
  * **Rich Markdown & Math**: Syntax-highlighted code blocks with one-click copy, and LaTeX math via KaTeX.
  * **Conversation Intelligence**: Pinned threads, tree-based conversation branching (forking), full-text search, and multi-format export (Markdown, JSON).

---

## Monorepo Architecture

```text
voltix-1/
├── node_modules/                   # Centralized Node.js dependencies
├── .venv/                          # Centralized Python virtual environment
├── package.json                    # Root workspace orchestration
├── docker-compose.yml              # Multi-container production deployment
├── Makefile                        # Quick developer targets
│
├── frontend/                       # Next.js 16 App Router + React 19 + Tailwind CSS v4
│   ├── app/                        # App router pages (Main Chat & /studio)
│   ├── components/                 # Preline chat, composer, agent center, inspector
│   ├── hooks/                      # Custom hooks (useChat, useAgent, useModels, etc.)
│   ├── lib/                        # API SDK, SSE stream parser, storage
│   └── types/                      # TypeScript definitions
│
├── backend/                        # FastAPI + Python 3.11 asynchronous backend
│   ├── app/
│   │   ├── agent/                  # Aetherion runtime, planner, verifier, policy
│   │   ├── api/                    # REST routers (Chat, Agent, Conversations, Models, RAG)
│   │   ├── chat/                   # Prompt assembly & conversational orchestrator
│   │   ├── core/                   # Logging, RFC 7807 exceptions, sandboxing
│   │   ├── database/               # Async SQLAlchemy 2.0 models & engine
│   │   ├── files/                  # Upload lifecycle & sanitation
│   │   ├── llm/                    # Ollama provider bridge & fallback assistant
│   │   ├── memory/                 # Sliding context window & token budget
│   │   ├── rag/                    # Parsers, chunker, vector store, retriever
│   │   ├── schemas/                # Pydantic request & response schemas
│   │   └── tools/                  # 17+ autonomous tools & execution registry
│   └── tests/                      # Pytest verification suites
│
├── data/                           # SQLite database (app.db), uploads & vector indices
├── docs/                           # Comprehensive technical documentation suite
└── scripts/                        # Development, testing, and benchmark runners
```

---

## Quick Start Guide

### 1. Prerequisites

* **Node.js** (v18.17.0+ or v20.x+ LTS) and **npm** v10+
* **Python** (3.10+ or 3.11) or `uv`
* (Recommended) **Ollama** installed from [ollama.com](https://ollama.com)

### 2. Environment Setup

```bash
# Clone repository
git clone https://github.com/Mekesh-Engineer/Ai_for_Engineers.git voltix-1
cd voltix-1

# Copy environment template
cp .env.example .env
```

### 3. Centralized Dependency Installation

**Step A — Install Backend Python Dependencies into root `.venv`:**
```bash
# Using uv (fastest):
uv venv .venv --python 3.11
uv pip install -r backend/requirements.txt --python .venv/Scripts/python.exe

# Or using standard Python venv:
python -m venv .venv
.venv\Scripts\pip install -r backend/requirements.txt
# Linux/macOS: source .venv/bin/activate && pip install -r backend/requirements.txt
```

**Step B — Install Centralized Node.js Dependencies into root `node_modules`:**
```bash
npm install
```

---

## Running the Platform

### Single-Command Full-Stack Development

Start the entire application (Frontend, Backend, and Ollama active probing) with a single command:

```bash
npm run dev:all
```

* **Frontend**: [http://localhost:3000](http://localhost:3000)
* **Model Comparison Studio**: [http://localhost:3000/studio](http://localhost:3000/studio)
* **Interactive API Documentation (Swagger)**: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)
* **Alternative API Documentation (Redoc)**: [http://localhost:8000/api/redoc](http://localhost:8000/api/redoc)

### Individual Commands

| Command | Action |
| :--- | :--- |
| `npm run dev:all` | **Start complete full-stack platform (Backend + Frontend)** |
| `npm run dev:backend` | Start only the FastAPI backend server using root `.venv` |
| `npm run dev:frontend`| Start only the Next.js frontend server using root `node_modules` |
| `npm test` | Run backend Pytest test suite using root `.venv` |
| `npm run verify` | Run end-to-end automated service verification script |
| `npm run build` | Compile production Next.js frontend bundle |
| `npm run lint` | Run ESLint across the frontend codebase |
| `npm run typecheck` | Run TypeScript type checking on frontend |

---

## Active AI Model Fleet

Voltix supports local quantized on-device execution alongside cloud-accelerated Ollama models:

```text
NAME                         CAPABILITY / ROLE                 CONTEXT
nemotron-3-ultra:cloud       Master Reasoner & Swarm Lead       128k
nemotron-3-super:cloud       Multi-Agent Orchestrator           128k
nemotron-3-nano:30b-cloud    Fast Reasoning & Verification       64k
gpt-oss:120b-cloud           Deep Code, Math & Architecture     128k
gemma4:31b-cloud             Multimodal Vision & Analysis        64k
qwen2.5:7b                   Primary Local Worker & Tool Lead    32k
qwen2.5:3b                   Ultra-Low-Latency Conversational    32k
```

To pull the default local model:
```bash
ollama pull qwen2.5:7b
```

---

## Running Automated Tests & Benchmarks

Run the complete test suite:
```bash
npm test
```

Generate visual empirical benchmark plots:
```bash
.venv\Scripts\python scripts/generate_visualizations.py
```

---

## Comprehensive Technical Documentation

Explore the complete technical documentation suite in the [`docs/`](file:///e:/Projects/AI%20&%20ML/domain_specific_qa_system_project/voltix-1/docs) directory:

* [System Architecture](file:///e:/Projects/AI%20&%20ML/domain_specific_qa_system_project/voltix-1/docs/architecture.md) — End-to-end system and component architecture.
* [Aetherion Agent Runtime](file:///e:/Projects/AI%20&%20ML/domain_specific_qa_system_project/voltix-1/docs/agent_runtime.md) — Autonomous runtime, roles, planning, and verification.
* [Tools Ecosystem](file:///e:/Projects/AI%20&%20ML/domain_specific_qa_system_project/voltix-1/docs/tools_ecosystem.md) — 17+ autonomous tools, sandbox limits, and custom tool guide.
* [RAG Pipeline](file:///e:/Projects/AI%20&%20ML/domain_specific_qa_system_project/voltix-1/docs/rag_pipeline.md) — Document parsing, chunking, embeddings, and vector search.
* [Memory & Context Management](file:///e:/Projects/AI%20&%20ML/domain_specific_qa_system_project/voltix-1/docs/memory_and_context.md) — Context budgeting, branching trees, and persistence.
* [REST API Reference](file:///e:/Projects/AI%20&%20ML/domain_specific_qa_system_project/voltix-1/docs/api.md) — Complete OpenAPI specification across all endpoints.
* [Streaming & SSE Protocol](file:///e:/Projects/AI%20&%20ML/domain_specific_qa_system_project/voltix-1/docs/events_and_streaming.md) — Event streaming protocol and client parsing.
* [Frontend Architecture](file:///e:/Projects/AI%20&%20ML/domain_specific_qa_system_project/voltix-1/docs/frontend_architecture.md) — UI shell, Model Studio, SlideOver, and React hooks.
* [Model Fleet Setup](file:///e:/Projects/AI%20&%20ML/domain_specific_qa_system_project/voltix-1/docs/model_fleet_setup.md) — Ollama local and cloud fleet configuration.
* [Deployment Guide](file:///e:/Projects/AI%20&%20ML/domain_specific_qa_system_project/voltix-1/docs/deployment_guide.md) — Docker, systemd, reverse proxy, and production ops.
* [Security & Sandboxing](file:///e:/Projects/AI%20&%20ML/domain_specific_qa_system_project/voltix-1/docs/security_and_sandboxing.md) — Security policies, sandboxing, and HITL gates.
* [Benchmarks & Evaluation](file:///e:/Projects/AI%20&%20ML/domain_specific_qa_system_project/voltix-1/docs/benchmarks_and_evaluation.md) — Quantitative latency, throughput, and accuracy metrics.
* [Troubleshooting Runbook](file:///e:/Projects/AI%20&%20ML/domain_specific_qa_system_project/voltix-1/docs/troubleshooting.md) — Diagnostics, error codes, and issue recovery.

---

## License

This project is licensed under the MIT License - see the [LICENSE](file:///e:/Projects/AI%20&%20ML/domain_specific_qa_system_project/voltix-1/LICENSE) file for details.
