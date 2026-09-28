from typing import List, Dict, Any


class ConversationMemory:
    def __init__(self, max_history_messages: int = 12):
        self.max_history_messages = max_history_messages

    def prepare_messages(
        self,
        system_prompt: Dict[str, str],
        history: List[Dict[str, str]],
        current_message: str,
        retrieved_context: str = "",
    ) -> List[Dict[str, str]]:
        """
        Assembles the final prompt list:
        1. System prompt
        2. Retrieved RAG document context (if any)
        3. Sliding window of recent chat history
        4. Current user prompt
        """
        prepared = [system_prompt]

        # Inject RAG context right after system message
        if retrieved_context.strip():
            prepared.append({
                "role": "system",
                "content": f"Reference Document Context:\n{retrieved_context.strip()}"
            })

        # Trim history to sliding window
        recent_history = history[-self.max_history_messages:] if len(history) > self.max_history_messages else history
        for msg in recent_history:
            prepared.append({"role": msg["role"], "content": msg["content"]})

        # Append current user message
        prepared.append({"role": "user", "content": current_message})

        return prepared


conversation_memory = ConversationMemory()
