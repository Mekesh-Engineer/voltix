# Voltix Frontend — Next.js 16 Web Application

The frontend client for **Voltix** is built with **Next.js 16.3.6 (App Router)**, **React 19.2.8**, **Tailwind CSS v4**, and the authentic **Preline AI Chat** design system.

---

## Architecture Overview

```text
frontend/
├── app/
│   ├── layout.tsx              # Root HTML wrapper, metadata, theme provider
│   ├── page.tsx                # Main Chat interface & AppShell orchestration
│   ├── studio/
│   │   └── page.tsx            # Model Comparison Studio (side-by-side benchmarking)
│   └── globals.css             # Tailwind CSS v4 variables and custom micro-animations
│
├── components/
│   ├── agent/                  # Agent Control Center, Approval Modals, Artifact Drawer
│   ├── chat/                   # Message feed, streaming tokens, context meter, activity timeline
│   ├── composer/               # Auto-resizing input, attachments, mode & profile selectors
│   ├── sidebar/                # Navigation, conversation list, pin toggles, search
│   ├── sources/                # Cited source inspector & chunk text viewer
│   ├── markdown/               # KaTeX Math, CodeBlock syntax highlighting, Table renderer
│   ├── command/                # Global Cmd+K command palette
│   ├── layout/                 # 3-tier AppShell, Header, SlideOver drawer
│   └── ui/                     # Accessible Modals, Badges, Tooltips, Progress bars
│
├── hooks/
│   ├── useChat.ts              # Chat lifecycle, streaming reader, conversation branching
│   ├── useAgent.ts             # Aetherion agent runs, step monitoring, approval triggers
│   ├── useConversations.ts     # Conversation list, optimistic CRUD, pinning, search
│   ├── useFileUpload.ts        # Drag-and-drop file ingestion, upload progress, chunk previews
│   ├── useModels.ts            # Dynamic model discovery & active Ollama status polling
│   ├── useCommandPalette.ts    # Global keyboard shortcut manager (Cmd+K, /, Escape)
│   └── useTheme.ts             # Light, dark, and system theme manager
│
├── lib/
│   ├── api.ts                  # REST API client SDK with typed request/response models
│   ├── streaming.ts            # Server-Sent Events (SSE) parser with backpressure
│   ├── storage.ts              # Validated LocalStorage persistence manager
│   └── utils.ts                # Token estimator, class merger (cn), date grouping
│
└── types/                      # TypeScript definitions (chat, conversation, file, model)
```

---

## Development & Workspaces

The frontend is part of the root npm workspaces monorepo. Dependencies are hoisted to the project root.

### Running Development Server

From the **project root**:
```bash
# Start frontend only
npm run dev:frontend

# Or start complete full stack
npm run dev:all
```

The frontend will be available at [http://localhost:3000](http://localhost:3000) and the Model Comparison Studio at [http://localhost:3000/studio](http://localhost:3000/studio).

### Building for Production

From the project root:
```bash
npm run build
```

---

## Key Features

1. **Model Comparison Studio (`/studio`)**:
   * Side-by-side prompt execution across any two models in the active fleet.
   * Real-time metrics: Time to First Token (TTFT), Token generation throughput (TPS), and total duration.
   * Preset benchmark prompts covering Attention, Coding, Multi-Agent Reasoning, and Long Context.

2. **Real-time Context Budget Meter**:
   * Estimates prompt and history tokens client-side.
   * Visualizes active model context ceiling (e.g., 32k for Qwen, 128k for Nemotron/GPT-OSS).

3. **SlideOver Activity Inspector**:
   * Tabbed slide-over drawer inspecting Cited Sources, Document Chunks, and Tool I/O execution traces.

4. **Rich Typography & Mathematics**:
   * KaTeX LaTeX rendering (inline `$E=mc^2$` and block formulas).
   * Syntax-highlighted code blocks with language indicators and one-click copy.
