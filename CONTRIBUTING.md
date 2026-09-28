# Contributing to Voltix AI Platform

Thank you for your interest in contributing to **Voltix**! This document provides detailed guidelines for setting up your local environment, adhering to code style standards, creating new agentic tools, adding model providers, running automated tests, and submitting Pull Requests.

---

## 1. Code of Conduct & Principles

* **Code Safety First**: All agentic tools must implement input validation, timeout protection, error containment, and appropriate risk levels (`LOW`, `MEDIUM`, `HIGH`, `IRREVERSIBLE`).
* **Zero Hallucination Tolerance**: Tools and RAG components must provide deterministic responses or strictly cite sources.
* **Non-Destructive Operations**: File operations and conversation state modifications must support rollback, branching, and Human-in-the-Loop (HITL) approval gates.
* **Unified Dependencies**: Always manage Python and Node dependencies centrally from the repository root. Do not create isolated `node_modules` inside `frontend/` or duplicate `.venv` inside `backend/`.

---

## 2. Development Setup

### 2.1 Prerequisites
* **Node.js**: v18.17.0+ or v20.x+ (Node.js 20 LTS recommended) with `npm` v10+
* **Python**: 3.10+ (Python 3.11 recommended) or `uv`
* **Ollama**: Local Ollama runtime (optional, but recommended for local offline inference)

### 2.2 Setup Commands

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Mekesh-Engineer/Ai_for_Engineers.git voltix-1
   cd voltix-1
   ```

2. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```

3. **Install Python Backend Dependencies Centrally**:
   Using `uv` (recommended):
   ```bash
   uv venv .venv --python 3.11
   uv pip install -r backend/requirements.txt --python .venv/Scripts/python.exe
   ```
   Or standard `pip`:
   ```bash
   python -m venv .venv
   .venv\Scripts\pip install -r backend/requirements.txt
   # On Linux/macOS:
   # source .venv/bin/activate && pip install -r backend/requirements.txt
   ```

4. **Install Node Dependencies Centrally**:
   ```bash
   npm install
   ```

5. **Start Full Stack Development Server**:
   ```bash
   npm run dev:all
   ```

---

## 3. Code Standards & Style

### 3.1 Python Backend
* **Formatting & Linting**: Follow PEP 8 guidelines.
* **Type Annotations**: Use Python 3.10+ type annotations (`List`, `Dict`, `Optional`, `Union`, `Tuple`, or built-in generics).
* **Async by Default**: All I/O operations (HTTP calls, DB operations, file streaming) must use `async`/`await`.
* **Error Handling**: Raise domain-specific exceptions from `backend.app.core.exceptions` (e.g., `ToolExecutionError`, `FileValidationError`, `LLMProviderError`). All exceptions are mapped to RFC 7807 Problem Details.
* **Logging**: Use the structured logger from `backend.app.core.logging`. Avoid `print()` statements in production code.

### 3.2 Frontend (Next.js & React)
* **Framework**: Next.js 16 App Router with React 19.
* **Language**: Strict TypeScript. Avoid `any`; define explicit interfaces in `frontend/types/`.
* **Styling**: Tailwind CSS v4 with Preline UI tokens. Use `cn()` from `@/lib/utils` for conditional class joining.
* **Component Design**: Pure functional components with custom hooks for state management. Avoid prop drilling where hooks provide encapsulated logic.
* **Accessibility**: Support dark/light mode seamlessly, include ARIA attributes, ensure keyboard accessibility (`Tab`, `Escape`, `Cmd+K`), and respect `prefers-reduced-motion`.

---

## 4. How to Add a New Agentic Tool

To create a new tool in the Aetherion autonomous ecosystem:

1. **Create the Tool Implementation**:
   Create a new file under `backend/app/tools/<tool_name>.py` extending `BaseTool` from `backend.app.tools.base`.

   ```python
   from typing import Dict, Any
   from pydantic import BaseModel, Field
   from backend.app.tools.base import BaseTool, ToolDefinition, ToolResult

   class SampleToolInput(BaseModel):
       query: str = Field(..., description="Target search query")

   class SampleTool(BaseTool):
       def __init__(self):
           super().__init__(
               definition=ToolDefinition(
                   name="sample.query",
                   description="Queries a custom knowledge source.",
                   category="knowledge",
                   risk_level="low",
                   requires_confirmation=False,
                   timeout_seconds=15,
                   input_schema=SampleToolInput.model_json_schema(),
               )
           )

       async def execute(self, query: str, **kwargs) -> ToolResult:
           try:
               # Tool execution logic here
               result_data = f"Queried: {query}"
               return ToolResult(success=True, output=result_data)
           except Exception as e:
               return ToolResult(success=False, error=str(e))
   ```

2. **Register in Tool Registry**:
   Add the instance in `_initialize_core_tools` within `backend/app/tools/registry.py`.

3. **Add Tests**:
   Add unit tests in `backend/tests/test_tools.py` verifying successful execution, error conditions, and timeout handling.

---

## 5. How to Add a New LLM Provider

1. **Extend Base Provider**:
   Implement the `LLMProvider` interface defined in `backend/app/llm/base.py`.
2. **Implement Required Methods**:
   * `is_available() -> bool`
   * `list_models() -> List[ModelInfo]`
   * `generate(messages, model, temperature, max_tokens) -> str`
   * `stream(messages, model, temperature, max_tokens) -> AsyncGenerator[str, None]`
3. **Connect Router**:
   Register the provider within `backend/app/llm/router.py`.

---

## 6. Running Tests & Quality Checks

Run all verification suites prior to submitting a PR:

```bash
# 1. Run backend unit & integration tests
npm test
# Or directly with python:
.venv\Scripts\python -m pytest backend/tests

# 2. Run frontend linting
npm run lint

# 3. Verify TypeScript types
npm run typecheck

# 4. Verify end-to-end service status
npm run verify
```

---

## 7. Submitting Pull Requests

1. **Branch Naming**:
   * `feat/feature-name` for new capabilities.
   * `fix/bug-description` for bug fixes.
   * `docs/documentation-update` for documentation changes.
   * `refactor/module-name` for code refactoring.
2. **Commit Messages**:
   Follow conventional commits format:
   * `feat(agent): add multi-agent subagent delegation`
   * `fix(rag): fix pdf parser table text truncation`
   * `docs(api): update OpenAPI documentation for aetherion endpoints`
3. **PR Description**: Include a clear summary of changes, rationale, testing done, and link relevant issues.
