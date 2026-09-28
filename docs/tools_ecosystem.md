# Autonomous Tool Ecosystem & Sandbox Reference

**Target Module:** `backend/app/tools/`  
**Status:** Production  
**Core Components:** `registry.py`, `base.py`, `calculator.py`, `python.py`, `web.py`, `filesystem.py`, `code.py`, `database_tools.py`, `knowledge.py`, `math_tools.py`, `memory_tools.py`, `tasks_tools.py`, `vision.py`, `artifacts.py`, `data.py`, `terminal.py`

---

## 1. Overview

Voltix integrates an enterprise ecosystem of 17+ autonomous tools managed dynamically by the `ToolRegistry` (`backend/app/tools/registry.py`). Each tool provides a formal JSON Schema parameter definition, operational risk level, execution timeout, and optional deterministic memory caching.

---

## 2. Complete Tool Directory

### 2.1 Computation & Analytics

#### `math.calculate` / `calculator`
* **Purpose**: Evaluates mathematical and trigonometric expressions with absolute safety.
* **Mechanism**: Uses Python's Abstract Syntax Tree (`ast.parse`) to traverse and compute mathematical nodes. Strict prohibition of `eval()` or `exec()`.
* **Risk Level**: `LOW`
* **Input Schema**:
  ```json
  {
    "expression": "string (e.g., 'sqrt(144) + 12 * sin(pi / 2)')"
  }
  ```
* **Supported Operators**: `+`, `-`, `*`, `/`, `//`, `%`, `**`, `abs`, `round`, `sqrt`, `sin`, `cos`, `tan`, `log`, `log10`, `exp`, `pi`, `e`.

#### `math.statistics`
* **Purpose**: Computes comprehensive descriptive statistics over numerical arrays.
* **Risk Level**: `LOW`
* **Input Schema**:
  ```json
  {
    "data": [12.4, 15.8, 19.2, 22.1, 14.7]
  }
  ```
* **Outputs**: Mean, median, standard deviation, variance, min, max, quartiles.

#### `python` (Child-Process Sandbox)
* **Purpose**: Executes arbitrary Python algorithms, data transformations, and analysis scripts.
* **Sandbox Enforcement**:
  * Runs in an isolated `multiprocessing` child process.
  * Enforces a hard execution timeout (`PYTHON_TIMEOUT_SECONDS = 15s`).
  * Enforces maximum process memory limit (`PYTHON_MAX_MEMORY_MB = 256 MB`).
  * Intercepts `stdout` and `stderr` streams safely.
* **Risk Level**: `HIGH` (Requires confirmation if elevated policies are active).
* **Input Schema**:
  ```json
  {
    "code": "string (Python source code)"
  }
  ```

---

### 2.2 Web & Research Intelligence

#### `web.search`
* **Purpose**: Queries web search indices for real-time external information.
* **Risk Level**: `LOW`
* **Input Schema**:
  ```json
  {
    "query": "string (search terms)",
    "num_results": 5
  }
  ```

#### `web.open`
* **Purpose**: Fetches and parses readable text content from a specific URL.
* **Risk Level**: `LOW`
* **Input Schema**:
  ```json
  {
    "url": "https://example.com/article"
  }
  ```

#### `web.research`
* **Purpose**: Conducts deep multi-query autonomous web research on a specific topic, aggregating verified findings.
* **Risk Level**: `MEDIUM`
* **Input Schema**:
  ```json
  {
    "topic": "string",
    "depth": 2
  }
  ```

---

### 2.3 Knowledge Base & RAG

#### `knowledge.search`
* **Purpose**: Executes semantic vector search across all indexed documents.
* **Risk Level**: `LOW`
* **Input Schema**:
  ```json
  {
    "query": "string",
    "top_k": 5
  }
  ```

#### `knowledge.list_documents`
* **Purpose**: Lists all documents currently indexed in the active vector database.
* **Risk Level**: `LOW`
* **Input Schema**: `{}`

#### `knowledge.graph_query`
* **Purpose**: Queries entity relationships and knowledge graph nodes.
* **Risk Level**: `LOW`

---

### 2.4 Filesystem & Workspace Manipulation

#### `filesystem.list`
* **Purpose**: Lists files and directories within the safe `data/` workspace.
* **Risk Level**: `LOW`
* **Input Schema**:
  ```json
  {
    "path": "string (relative path)"
  }
  ```

#### `filesystem.read`
* **Purpose**: Reads file content with UTF-8 decoding and error handling.
* **Risk Level**: `LOW`
* **Input Schema**:
  ```json
  {
    "path": "string"
  }
  ```

#### `filesystem.write`
* **Purpose**: Creates or overwrites files within the safe workspace directory.
* **Risk Level**: `MEDIUM`
* **Input Schema**:
  ```json
  {
    "path": "string",
    "content": "string"
  }
  ```

#### `filesystem.delete`
* **Purpose**: Deletes files within the workspace directory.
* **Risk Level**: `IRREVERSIBLE` (Always triggers Human-in-the-Loop approval gate).
* **Input Schema**:
  ```json
  {
    "path": "string"
  }
  ```

---

### 2.5 Code Intelligence

#### `code.search`
* **Purpose**: Performs AST and regex searches across codebase files.
* **Risk Level**: `LOW`

#### `code.read`
* **Purpose**: Reads source code files with line-number indexing.
* **Risk Level**: `LOW`

#### `code.diff`
* **Purpose**: Generates unified diffs between original and modified code snippets.
* **Risk Level**: `LOW`

#### `code.test`
* **Purpose**: Runs automated tests on provided code snippets within the sandbox.
* **Risk Level**: `HIGH`

---

### 2.6 Persistence, Tasks & Artifacts

#### `database.schema`
* **Purpose**: Inspects active SQLite database table schemas and foreign key constraints.
* **Risk Level**: `LOW`

#### `database.query_readonly`
* **Purpose**: Executes read-only `SELECT` queries against application databases. Strict prohibition of mutating statements (`INSERT`, `UPDATE`, `DELETE`, `DROP`).
* **Risk Level**: `MEDIUM`

#### `terminal.run_safe`
* **Purpose**: Runs safe terminal utilities against an allowlist of commands (`git`, `ls`, `cat`, `pytest`).
* **Risk Level**: `HIGH`

#### `terminal.which`
* **Purpose**: Checks availability and path of system executables.
* **Risk Level**: `LOW`

#### `memory.store` & `memory.search`
* **Purpose**: Stores and retrieves persistent conversational facts and project context.
* **Risk Level**: `LOW`

#### `tasks.create` & `tasks.list`
* **Purpose**: Manages asynchronous background tasks and schedule tracking.
* **Risk Level**: `LOW`

#### `vision.inspect`
* **Purpose**: Performs optical character recognition (OCR) and visual artifact inspection.
* **Risk Level**: `LOW`

#### `artifacts.create_report` / `artifacts.create_code`
* **Purpose**: Synthesizes physical artifacts (Markdown reports, code snippets, CSV spreadsheets) stored under `data/artifacts/`.
* **Risk Level**: `LOW`

---

## 3. Tool Caching & Execution Metrics

The `ToolRegistry` records operational metrics for every tool invocation:

* `total_calls`: Lifetime invocation count.
* `successful_calls`: Completed calls without errors.
* `failed_calls`: Exceptions, timeouts, or policy rejections.
* `success_rate`: Percentage of successful runs.
* `avg_latency_ms`: Moving average execution latency in milliseconds.

### Deterministic Result Caching
Deterministic read-only tools (`math`, `knowledge`) use an in-memory `ToolResultCache` with a 300-second TTL. Duplicate queries with identical parameters return cached results with sub-millisecond response times.
