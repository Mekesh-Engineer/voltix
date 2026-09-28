# Aetherion Autonomous Agent Runtime

**Target Module:** `backend/app/agent/`  
**Status:** Production  
**Core Components:** `aetherion.py`, `planner.py`, `runtime.py`, `policy.py`, `verifier.py`, `model_registry.py`, `events.py`, `state.py`, `subagents.py`

---

## 1. Overview

**Aetherion** is an autonomous multi-agent operating runtime that coordinates specialized local and cloud models to solve complex, multi-step engineering, analytical, and coding tasks. Rather than relying on a single static model, Aetherion analyzes incoming user goals, decomposes them into hierarchical directed acyclic graph (DAG) tasks, delegates subtasks to specialized model roles, validates outputs with an independent verification engine, and enforces Human-in-the-Loop (HITL) approval gates.

---

## 2. Model Fleet Roles

Aetherion maps logical agent roles to specific models in the fleet:

| Logical Role | Assigned Model | Description & Specialization | Typical Context |
| :--- | :--- | :--- | :--- |
| **`aetherion-ultra`** | `nemotron-3-ultra:cloud` | Master Reasoner & Long-Horizon Architect | 128k tokens |
| **`aetherion-super`** | `nemotron-3-super:cloud` | Multi-Agent Swarm Orchestrator | 128k tokens |
| **`aetherion-nano`** | `nemotron-3-nano:30b-cloud` | Rapid Step Reasoning & Verification | 64k tokens |
| **`aetherion-reason`** | `gpt-oss:120b-cloud` | Deep Technical Code, Math & Algorithm Design | 128k tokens |
| **`aetherion-vision`** | `gemma4:31b-cloud` | Multimodal Vision, Diagram & Visual Data Analysis | 64k tokens |
| **`aetherion-fast`** | `qwen2.5:7b` | Primary Local Worker, Tool Dispatch & Synthesis | 32k tokens |
| **`aetherion-mini`** | `qwen2.5:3b` | Ultra-Low-Latency Conversational & Intent Worker | 32k tokens |

---

## 3. Execution Profiles & Routing

When a prompt is received, the `aetherion_router` evaluates prompt length, keyword intent, file attachments, and user-selected profile to generate an `AetherionRouteDecision`:

```python
class ExecutionProfile(str, Enum):
    FAST = "fast"          # Minimal latency, single-turn or lightweight local execution
    BALANCED = "balanced"  # Standard agentic execution (Planner + Worker + Verifier)
    DEEP = "deep"          # Multi-step planning, iterative execution, thorough auditing
    MAX = "max"            # Swarm orchestration, parallel subagents, debate & max verification
```

### Ensemble Levels

```text
Level 0: DIRECT        --> Single Model Execution
Level 1: ASSISTED      --> Primary Worker + Lightweight Verifier
Level 2: AGENT         --> Planner + Tool Execution Loop + Verifier
Level 3: MULTI_AGENT   --> Master Planner + Domain Specialists (Coder, Researcher) + Verifier
Level 4: MAX_ENSEMBLE  --> Master Orchestrator + Parallel Specialist Swarm + Debate + Audit
```

### Intent Classification
The runtime automatically classifies goals into one of the following intents:
* `CONVERSATION`: Direct conversational answers without tool overhead.
* `QUICK_CALC`: Mathematical evaluation routed to safe AST evaluator.
* `CODE_DEVELOPMENT`: Code generation, AST verification, and unit test execution.
* `CODE_DEBUG`: Diff analysis and execution in Python sandbox.
* `DEEP_RESEARCH`: Multi-query web search and document RAG synthesis.
* `DATA_ANALYSIS`: Tabular inspection (CSV/XLSX) and statistical calculations.
* `DOCUMENT_RAG`: Semantic document chunk search and citation assembly.
* `AUTONOMOUS_PROJECT`: Long-horizon project planning with physical artifact creation.

---

## 4. Hierarchical Planner & Execution State

### 4.1 Plan Formation (`planner.py`)
1. **Goal Analysis**: Decomposes user goal into sequential steps (`AgentStep`).
2. **Dependency Tracking**: Identifies step prerequisites and required tools.
3. **Budget Allocation**: Sets maximum token allocation (default: 64,000) and time budget (default: 300s).

### 4.2 State Machine (`state.py`)

```text
[CREATED] ──► [ANALYZING] ──► [PLANNING] ──► [EXECUTING] ──► [VERIFYING] ──► [COMPLETED]
                                                  │                │
                                                  ▼                ▼
                                         [WAITING_APPROVAL]    [REPLANNING]
                                                  │                │
                                                  ▼                ▼
                                              [PAUSED]          [FAILED]
```

### 4.3 Step Execution Cycle
For each step in the active plan:
1. **Tool Parameter Formulation**: Generates JSON input for the designated tool.
2. **Policy Authorization**: Verifies permissions via `policy_engine`. If elevated risk, triggers an approval request.
3. **Execution**: Dispatches tool to child-process sandbox or worker.
4. **Independent Verification**: Validates results via `verification_engine`.
5. **State Persistence**: Creates an `AgentCheckpoint` record in SQLite.

---

## 5. Independent Verification Engine (`verifier.py`)

To prevent hallucinations, the `verification_engine` runs deterministic checks on every output:
* **Math Claims**: Re-computes expressions independently via AST parser and compares with claimed answer (`|actual - claimed| < 1e-4`).
* **Artifact Persistence**: Verifies that generated files physically exist on disk and contain non-zero byte length.
* **Sandbox Exit Status**: Scans Python execution traces for unhandled exceptions, syntax errors, or timeouts.
* **Confidence Scoring**: Computes a confidence score ($0.0 - 1.0$) attached to the step diagnostics.

---

## 6. Security Policy & Human-in-the-Loop (`policy.py`)

All tool executions pass through the `PolicyEngine`:

```python
class RiskLevel(str, Enum):
    LOW = "low"                  # Safe read-only operations (e.g., math.calculate, web.search)
    MEDIUM = "medium"            # Mild state alterations (e.g., file write to workspace)
    HIGH = "high"                # Process execution or broad filesystem modifications
    IRREVERSIBLE = "irreversible" # File deletions or destructive commands
```

When `AGENT_HUMAN_IN_THE_LOOP_ENABLED` is `true`:
* Tools with `HIGH` or `IRREVERSIBLE` risk trigger an interactive approval request (`ApprovalManager`).
* Execution pauses asynchronously until the user submits an approval or denial via `POST /api/agent/approvals/{id}/respond`.
* If an approval times out (120s), the action is automatically denied.

---

## 7. Asynchronous Event Bus (`events.py`)

During execution, Aetherion publishes events over an internal `asyncio.Queue` that are streamed directly to the frontend via Server-Sent Events (SSE):

* `AgentStarted` / `AgentPlanning`: Initiation and task decomposition.
* `StepStarted` / `StepCompleted` / `StepFailed`: Granular step execution state.
* `ToolCall`: Invocation details (tool name, parameters).
* `ToolResult`: Tool output and execution duration.
* `ApprovalRequired`: HITL confirmation trigger.
* `ArtifactCreated`: Physical artifact generation notification.
* `AgentCompleted` / `AgentFailed`: Final lifecycle termination.
