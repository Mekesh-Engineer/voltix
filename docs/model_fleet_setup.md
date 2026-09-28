# Model Fleet Setup & Configuration Guide

**Target Daemon:** Ollama (`http://localhost:11434` / `http://127.0.0.1:11434`)  
**Status:** Production  
**Default Local Model:** `qwen2.5:7b`  
**Default Utility Model:** `qwen2.5:3b`

---

## 1. Active Model Fleet Directory

Voltix unifies local on-device quantized models and cloud-bridged endpoints through a single asynchronous Ollama daemon bridge:

```text
NAME                         ID              SIZE      CAPABILITY & ROLE
nemotron-3-ultra:cloud       fc1664751465    -         Long-Horizon Master Reasoner (128k)
nemotron-3-super:cloud       c6398e09afd4    -         Multi-Agent Swarm Orchestrator (128k)
nemotron-3-nano:30b-cloud    2fd759a2eb63    -         Fast Step Reasoning & Verification (64k)
gpt-oss:120b-cloud           ac7f7a1e7785    -         Deep Architecture, Code & Math (128k)
gemma4:31b-cloud             ef09f235533c    -         Multimodal Vision & Analysis (64k)
qwen2.5:7b                   845dbda0ea48    4.7 GB    Primary Local Agent Worker & Tools (32k)
qwen2.5:3b                   357c53fb659c    1.9 GB    Ultra-Low-Latency Conversational Turn (32k)
```

---

## 2. Ollama Installation & Setup

### Step 1: Install Ollama
Download and install the official runtime for your operating system:
* **Windows**: Download installer from [ollama.com/download/windows](https://ollama.com/download/windows).
* **Linux**:
  ```bash
  curl -fsSL https://ollama.com/install.sh | sh
  ```
* **macOS**: Download from [ollama.com/download/mac](https://ollama.com/download/mac).

### Step 2: Start the Daemon
```bash
ollama serve
```
Verify the daemon is responsive:
```bash
curl http://127.0.0.1:11434/api/tags
```

### Step 3: Pull Core Local Models
```bash
# Pull the default 7B agent worker (4.7 GB)
ollama pull qwen2.5:7b

# Pull the ultra-fast 3B conversational worker (1.9 GB)
ollama pull qwen2.5:3b

# (Optional) Pull additional models
ollama pull llama3.2
ollama pull mistral
ollama pull deepseek-r1:8b
```

---

## 3. Hardware & GPU Acceleration

### NVIDIA CUDA Configuration (Windows / Linux)
Ollama automatically detects NVIDIA GPUs with CUDA compute capability $\ge 5.0$.

To verify GPU offload during inference:
```bash
# Windows PowerShell
nvidia-smi

# Linux
watch -n 1 nvidia-smi
```

### Apple Silicon (macOS)
Ollama leverages Metal Performance Shaders (MPS) across unified RAM automatically with zero additional configuration.

---

## 4. Backend Daemon Probing & Failover

The backend monitors Ollama connectivity on startup and through periodic health probes:

```python
# backend/app/llm/ollama.py
async def is_available(self) -> bool:
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.get(f"{self.base_url}/api/tags")
            return res.status_code == 200
    except Exception:
        return False
```

### Zero-Crash Offline Fallback Engine (`router.py`)
If the Ollama daemon is offline or starting up, the backend does not throw a 500 error or crash the application. Instead:
1. The `OllamaFallbackAssistant` automatically intercepts the request.
2. It emits helpful guidance explaining that Ollama is currently starting or unreachable on port `11434`.
3. It provides the exact shell commands needed to launch the daemon while preserving the conversational session state.
