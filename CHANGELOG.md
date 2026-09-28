# Changelog

All notable changes to the **Voltix AI Platform** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-09-26

### Added
* **Aetherion Autonomous Agent Runtime**:
  * Multi-model role orchestration (`aetherion-ultra`, `aetherion-super`, `aetherion-nano`, `aetherion-reason`, `aetherion-vision`, `aetherion-fast`, `aetherion-mini`).
  * Dynamic intent routing, complexity scoring, and adaptive execution profiles (`FAST`, `BALANCED`, `DEEP`, `MAX`).
  * Hierarchical task graph planning with parallel subagent swarms and automated replanning.
  * Independent verification engine validating calculations, claims, and physical artifacts before user synthesis.
  * Human-in-the-Loop (HITL) approval gates for elevated-risk actions (`LOW`, `MEDIUM`, `HIGH`, `IRREVERSIBLE`).
* **17+ Autonomous Tool Ecosystem**:
  * Safe AST mathematical evaluation (zero `eval()` usage) and statistical analysis.
  * Isolated child-process Python execution sandbox with configurable memory and CPU timeout enforcement.
  * Live web search, page reading, and deep web research agents.
  * Sandboxed filesystem management (read, write, delete, list).
  * Safe terminal execution with strict shell allowlists.
  * Code diffing, AST search, and automated test runners.
  * Read-only SQL database schema inspection and querying.
  * Long-term memory store and semantic recall.
  * Automated physical artifact synthesis (Markdown, code, CSV, visual reports).
* **Next.js 16 Frontend Upgrades**:
  * Interactive **Model Comparison Studio** (`/studio`) for side-by-side prompt execution, latency (TTFT), and throughput (TPS) benchmarking.
  * Real-time Context Budget Meter displaying live token consumption and active model context capacity.
  * SlideOver Activity Inspector with tabbed views for Cited Sources, Chunk Text, and Tool I/O execution traces.
  * Global `Cmd+K` Command Palette for quick search, model switching, and session management.
* **Conversation Intelligence**:
  * Tree-based non-destructive conversation branching (forking).
  * Session pinning and full-text keyword search across chat archives.
  * Multi-format session export (Markdown, JSON).
* **Automated Benchmarking Suite**:
  * `scripts/generate_visualizations.py` for empirical benchmark chart generation.
  * End-to-end integration and security test suites under `backend/tests/`.

### Changed
* Unified LLM router dedicated to the Ollama runtime with graceful offline fallback assistant.
* Migrated database schema to async SQLAlchemy 2.0 supporting `AgentRun`, `AgentStep`, `AgentCheckpoint`, `ToolApproval`, `Artifact`, and `TaskModel` tables.
* Hoisted all frontend and backend dependencies to the root project level via npm workspaces and root virtual environments.

---

## [1.0.0] - 2026-08-15

### Added
* Initial release of the AI Chat Platform.
* Preline AI Chat UI integration with light, dark, and system themes.
* Server-Sent Events (SSE) streaming chat pipeline.
* Multi-format RAG document ingestion for PDF, DOCX, XLSX, PPTX, CSV, and plain text.
* Vector storage using sparse subword n-gram indices and cosine similarity ranking.
* SQLite conversational persistence and automatic thread title generation.
* Docker Compose orchestration for local deployment.
