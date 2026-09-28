# Memory & Context Management

**Target Modules:** `backend/app/memory/`, `backend/app/database/`, `frontend/components/chat/ContextMeter.tsx`  
**Status:** Production  
**Core Components:** `conversation.py`, `models.py`, `useChat.ts`, `useConversations.ts`

---

## 1. Multi-Tier Memory Hierarchy

Voltix utilizes a three-tier memory architecture to balance immediate context relevance, token budget efficiency, and long-term cross-session recall:

```text
┌────────────────────────────────────────────────────────┐
│                   TIER 1: WORKING CONTEXT              │
│  - System Prompt & Safety Invariants                   │
│  - Retrieved RAG Document Snippets                     │
│  - Active Sliding Window of Recent Messages (12 turns) │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                TIER 2: CONVERSATION BRANCH TREE        │
│  - Relational message history in SQLite (app.db)       │
│  - Non-destructive branching (parent_id, branch_index) │
│  - Pinned conversation flags & full-text search        │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                TIER 3: LONG-TERM PROJECT MEMORY        │
│  - MemoryStoreTool (key-value facts & project notes)   │
│  - Persistent across disparate chat sessions           │
└────────────────────────────────────────────────────────┘
```

---

## 2. Sliding-Window Context Management (`conversation.py`)

To prevent token exhaustion while maintaining coherent multi-turn dialogue, `ConversationMemory` implements sliding-window truncation:

1. **System Prompt**: Always preserved at index 0.
2. **Document Context**: Inserted immediately following the system prompt.
3. **Recent Dialogue**: The most recent $N$ messages (default: 12 messages = 6 user/assistant turns) are included in full.
4. **Current User Turn**: Appended at the end of the context payload.

```python
class ConversationMemory:
    def __init__(self, max_history_messages: int = 12):
        self.max_history_messages = max_history_messages

    def prepare_messages(self, system_prompt, history, current_message, retrieved_context=""):
        prepared = [system_prompt]
        if retrieved_context.strip():
            prepared.append({
                "role": "system",
                "content": f"Reference Document Context:\n{retrieved_context.strip()}"
            })
        recent = history[-self.max_history_messages:] if len(history) > self.max_history_messages else history
        for msg in recent:
            prepared.append({"role": msg["role"], "content": msg["content"]})
        prepared.append({"role": "user", "content": current_message})
        return prepared
```

---

## 3. Real-Time Context Budget Meter

The frontend interface monitors token consumption in real time via the `ContextMeter` component:

* **Token Estimation**: Computed using character length heuristics ($\approx 4\text{ chars per token}$).
* **Model Limits**: Dynamically calibrated against active model capabilities:
  * `qwen2.5:7b` / `qwen2.5:3b`: 32,768 tokens.
  * `nemotron-3-nano:30b-cloud`: 65,536 tokens.
  * `nemotron-3-ultra:cloud` / `gpt-oss:120b-cloud`: 131,072 tokens.
* **Visual States**:
  * **Normal (Green/Teal)**: $<70\%$ context used.
  * **Warning (Amber)**: $70\%–90\%$ context used.
  * **Critical (Red)**: $>90\%$ context used. Triggers automatic sliding-window truncation warning.

---

## 4. Conversation Branching (Forking)

Voltix supports non-destructive conversation branching. Users can edit past messages or regenerate responses at any point in history, creating alternative branch paths without losing earlier dialogue.

### Data Model (`messages` table):
* `id`: Unique UUID primary key.
* `conversation_id`: Foreign key referencing `conversations.id`.
* `parent_id`: ID of the preceding message (nullable for root prompts).
* `branch_index`: Zero-indexed integer indicating alternative branch versions of the same node.

### Branching Endpoint:
`POST /api/conversations/{id}/branch`
```json
{
  "message_id": "msg_001",
  "fork_new_conversation": false
}
```
* If `fork_new_conversation = true`, duplicates message history up to `message_id` into a new conversation thread.
* If `fork_new_conversation = false`, creates a sibling branch at `branch_index + 1`.

---

## 5. Thread Management & Multi-Format Export

* **Automated Title Generation**: After the first prompt-response exchange, an asynchronous worker summarizes user intent into a 3–5 word title.
* **Pinning**: Important conversations can be pinned to remain at the top of the sidebar.
* **Search**: Full-text search across titles and message bodies via `GET /api/conversations/search?q={term}`.
* **Export Formats**:
  * **Markdown (`GET /api/conversations/{id}/export?format=markdown`)**: Clean, formatted transcript with headers, code blocks, and cited sources.
  * **JSON (`GET /api/conversations/{id}/export?format=json`)**: Full relational export including message IDs, tool logs, metadata, and timestamps.
