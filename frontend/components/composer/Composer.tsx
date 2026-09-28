"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Paperclip } from "lucide-react";
import { ModelInfo } from "@/types/model";
import { FileInfo } from "@/types/file";
import { PendingApprovalUI } from "@/hooks/useAgent";
import {
  ComposerMode,
  PrivacyMode,
  ExecutionProfile,
  ComposerState,
  SlashCommand,
  MentionItem,
} from "./types";
import { ModeSelector } from "./ModeSelector";
import { ToolCenter } from "./ToolCenter";
import { AdvancedMenu } from "./AdvancedMenu";
import { AttachmentTray } from "./AttachmentTray";
import { ContextBar } from "./ContextBar";
import { ToolSuggestions } from "./ToolSuggestions";
import { SlashMenu } from "./SlashMenu";
import { MentionMenu } from "./MentionMenu";
import { ExecutionStatus } from "./ExecutionStatus";
import { ApprovalPrompt } from "./ApprovalPrompt";
import { VoiceButton } from "./VoiceButton";
import { SendButton } from "./SendButton";
import { PasteBanner, PasteDetection } from "./PasteBanner";
import { DropOverlay } from "./DropOverlay";

interface ComposerProps {
  models: ModelInfo[];
  selectedModel: string;
  selectedProvider: string;
  ollamaActive: boolean;
  onSelectModel: (modelId: string) => void;
  isStreaming: boolean;
  streamingStatus?: string | null;
  onSendMessage: (
    message: string,
    attachments?: string[],
    toolsEnabled?: boolean,
    mode?: ComposerMode,
    tools?: string[],
    profile?: ExecutionProfile,
  ) => void;
  onStop: () => void;
  onPause?: () => void;
  onResume?: () => void;
  attachments: FileInfo[];
  uploading: boolean;
  onUploadFile: (file: File) => Promise<unknown>;
  onRemoveAttachment: (fileId: string) => void;
  input: string;
  setInput: (value: string) => void;
  pendingApproval?: PendingApprovalUI | null;
  onRespondApproval?: (approved: boolean) => void;
  currentTokens?: number;
  maxTokens?: number;
}

export function Composer({
  models = [],
  isStreaming,
  streamingStatus = null,
  onSendMessage,
  onStop,
  onPause,
  onResume,
  attachments = [],
  uploading,
  onUploadFile,
  onRemoveAttachment,
  input,
  setInput,
  pendingApproval = null,
  onRespondApproval,
  currentTokens = 0,
  maxTokens = 8192,
}: ComposerProps) {
  // Composer mode & state
  const [mode, setMode] = useState<ComposerMode>("auto");
  const [profile, setProfile] = useState<ExecutionProfile>("balanced");
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>("auto");
  const [toolsEnabled, setToolsEnabled] = useState(true);
  const [activeTools, setActiveTools] = useState<string[]>([
    "web.search",
    "knowledge.search",
    "math.calculate",
    "python.execute",
    "data.inspect",
  ]);

  // Popovers & menus
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");
  const [mentionMenuOpen, setMentionMenuOpen] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [pasteDetection, setPasteDetection] = useState<PasteDetection | null>(
    null,
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute ComposerState
  const composerState: ComposerState = useMemo(() => {
    if (pendingApproval) return "waiting_approval";
    if (isStreaming) return "running";
    if (uploading) return "attaching";
    if (input.trim() || attachments.length > 0) return "ready";
    return "idle";
  }, [pendingApproval, isStreaming, uploading, input, attachments]);

  // Context-aware dynamic placeholder
  const placeholder = useMemo(() => {
    if (attachments.length > 0) {
      const hasImg = attachments.some((a) => {
        const n = (a.originalName || "").toLowerCase();
        return (
          n.endsWith(".png") ||
          n.endsWith(".jpg") ||
          n.endsWith(".jpeg") ||
          n.endsWith(".webp") ||
          n.endsWith(".gif") ||
          n.endsWith(".bmp") ||
          n.endsWith(".svg") ||
          n.endsWith(".avif") ||
          (a.mimeType || "").startsWith("image/")
        );
      });
      if (hasImg) {
        return `Ask anything about the attached image (e.g. 'Analyze this diagram', 'Extract text', 'What does this show?')...`;
      }
      return `Ask anything about ${attachments.length === 1 ? `"${attachments[0].originalName}"` : `these ${attachments.length} files`}...`;
    }
    switch (mode) {
      case "agent":
        return "Describe what you want the agent to accomplish (planning + tools + execution)...";
      case "research":
        return "What should I research? Web search, verify sources, and extract citations...";
      case "code":
        return "Describe the code to build, debug, or refactor in sandbox...";
      case "data":
        return "Ask a question about your data or request statistical analysis and charts...";
      case "rag":
        return "Search and query indexed documents and knowledge chunks...";
      case "local":
        return "Ask anything using strictly local on-device Ollama models...";
      default:
        return "Ask Aetherion anything... (Enter to send, / for commands, @ to mention, Ctrl+V to paste images)";
    }
  }, [mode, attachments]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const nextHeight = Math.min(textareaRef.current.scrollHeight, 180);
      textareaRef.current.style.height = `${Math.max(nextHeight, 48)}px`;
    }
  }, [input]);

  // Keyboard shortcut handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Esc closes menus or stops generation
    if (e.key === "Escape") {
      if (slashMenuOpen) {
        setSlashMenuOpen(false);
        return;
      }
      if (mentionMenuOpen) {
        setMentionMenuOpen(false);
        return;
      }
      if (isStreaming) {
        onStop();
        return;
      }
    }

    // Enter / Cmd+Enter sends
    if (e.key === "Enter" && !e.shiftKey) {
      if (slashMenuOpen || mentionMenuOpen) return;
      e.preventDefault();
      handleSend();
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
      return;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    // Slash command trigger
    if (val.startsWith("/")) {
      setSlashMenuOpen(true);
      setSlashFilter(val);
    } else {
      setSlashMenuOpen(false);
    }

    // Mention trigger (@)
    const lastWord = val.split(/\s+/).pop() || "";
    if (lastWord.startsWith("@")) {
      setMentionMenuOpen(true);
      setMentionFilter(lastWord);
    } else {
      setMentionMenuOpen(false);
    }
  };

  const handleSend = useCallback(() => {
    const text = input.trim();
    if ((!text && attachments.length === 0) || isStreaming) return;

    const fileIds = attachments.map((a) => a.id);
    onSendMessage(text, fileIds, toolsEnabled, mode, activeTools, profile);

    setInput("");
    setSlashMenuOpen(false);
    setMentionMenuOpen(false);
    setPasteDetection(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = "48px";
    }
  }, [
    input,
    attachments,
    isStreaming,
    onSendMessage,
    toolsEnabled,
    mode,
    activeTools,
    profile,
    setInput,
  ]);

  // Paste intelligence detection & Clipboard Screenshot/Image Interceptor
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    let hasImage = false;

    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (blob) {
            e.preventDefault();
            hasImage = true;
            const ext = blob.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
            const filename = `screenshot_${Date.now()}.${ext}`;
            const imageFile = new File([blob], filename, { type: blob.type });
            onUploadFile(imageFile).catch((err) =>
              console.error("Clipboard image upload failed:", err)
            );
          }
        }
      }
    }

    if (hasImage) return;

    const text = e.clipboardData.getData("text");
    if (!text) return;

    // Detect URL
    if (/^https?:\/\/[^\s]+$/.test(text.trim())) {
      setPasteDetection({ type: "url", content: text.trim() });
      return;
    }

    // Detect Code (multiple lines with common code symbols)
    if (
      (text.includes("def ") ||
        text.includes("function ") ||
        text.includes("import ") ||
        text.includes("const ") ||
        text.includes("class ") ||
        text.includes("return ")) &&
      text.split("\n").length > 2
    ) {
      setPasteDetection({ type: "code", content: text });
      return;
    }
  };


  // File Upload Handling
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      try {
        await onUploadFile(files[i]);
      } catch (err) {
        console.error("File upload failed:", err);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      try {
        await onUploadFile(files[i]);
      } catch (err) {
        console.error("Drop file upload failed:", err);
      }
    }
  };

  // Tool toggle handlers
  const handleToggleTool = (toolId: string) => {
    setActiveTools((prev) =>
      prev.includes(toolId)
        ? prev.filter((id) => id !== toolId)
        : [...prev, toolId],
    );
  };

  const handleEnableTool = (toolId: string) => {
    if (!activeTools.includes(toolId)) {
      setActiveTools((prev) => [...prev, toolId]);
    }
    setToolsEnabled(true);
  };

  const handleSlashSelect = (cmd: SlashCommand) => {
    if (cmd.profile) {
      setProfile(cmd.profile);
      setInput("");
    } else if (cmd.mode) {
      setMode(cmd.mode);
      setInput("");
    } else if (cmd.cmd === "/model") {
      setInput("/model ");
    } else {
      setInput(`${cmd.cmd} `);
    }
    setSlashMenuOpen(false);
    textareaRef.current?.focus();
  };

  const handleMentionSelect = (item: MentionItem) => {
    const words = input.split(/\s+/);
    words.pop();
    const updated = [...words, item.label, ""].join(" ").trimStart();
    setInput(updated);
    setMentionMenuOpen(false);
    textareaRef.current?.focus();
  };

  return (
    <div
      className="relative z-30 w-full max-w-4xl mx-auto px-3 sm:px-4 pb-3 pt-1"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <DropOverlay isDragging={isDragging} />

      {/* Main Command Center Surface */}
      <div className="relative rounded-2xl border border-stone-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl transition-all focus-within:border-blue-500/80 focus-within:ring-2 focus-within:ring-blue-500/15">
        {/* Execution & Streaming Status Surface */}
        <ExecutionStatus
          isRunning={isStreaming}
          isPaused={false}
          statusText={streamingStatus}
          onStop={onStop}
          onPause={onPause}
          onResume={onResume}
        />

        {/* Approval Prompt if human confirmation is required */}
        {pendingApproval && onRespondApproval && (
          <ApprovalPrompt
            approval={pendingApproval}
            onRespond={onRespondApproval}
          />
        )}

        {/* Active Context Chips & Token Utilization */}
        <ContextBar
          mode={mode}
          onResetMode={() => setMode("auto")}
          profile={profile}
          activeTools={activeTools}
          onRemoveTool={handleToggleTool}
          privacyMode={privacyMode}
          tokenCount={currentTokens}
          maxTokens={maxTokens}
        />

        {/* File Attachments Tray with Intelligence Pills */}
        <AttachmentTray
          attachments={attachments}
          uploading={uploading}
          onRemove={onRemoveAttachment}
          onQuickAction={(action) => {
            setInput(input ? `${input} ${action}` : action);
            textareaRef.current?.focus();
          }}
        />

        {/* Paste Intelligence Banner */}
        <PasteBanner
          detection={pasteDetection}
          onApplyAction={(prefix) => {
            setInput(`${prefix}${input}`);
            setPasteDetection(null);
            textareaRef.current?.focus();
          }}
          onDismiss={() => setPasteDetection(null)}
        />

        {/* Slash Command Autocomplete Popover */}
        <div className="relative">
          <SlashMenu
            isOpen={slashMenuOpen}
            filterText={slashFilter}
            onSelect={handleSlashSelect}
            onClose={() => setSlashMenuOpen(false)}
          />

          <MentionMenu
            isOpen={mentionMenuOpen}
            filterText={mentionFilter}
            attachments={attachments}
            models={models}
            onSelect={handleMentionSelect}
            onClose={() => setMentionMenuOpen(false)}
          />
        </div>

        {/* Intelligent Text Area */}
        <div className="p-2 sm:p-2.5">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            rows={1}
            disabled={isStreaming}
            className="w-full resize-none bg-transparent px-3 py-1.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none dark:text-neutral-100 dark:placeholder:text-neutral-500 leading-relaxed max-h-48 overflow-y-auto disabled:opacity-50"
          />

          {/* Prompt-driven Tool Suggestions */}
          <ToolSuggestions
            input={input}
            activeTools={activeTools}
            onEnableTool={handleEnableTool}
          />

          {/* Bottom Command Toolbar (Section 6 & 35) */}
          <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-neutral-800/80 gap-1.5 flex-wrap">
            {/* Primary Left Controls: Attach, Mode, Tools, Advanced Drawer */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
                accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.bmp,.svg,.ico,.avif,.pdf,.docx,.txt,.md,.csv,.xlsx,.pptx,.json,.html,.py,.js,.ts"
              />

              {/* Attach File Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || isStreaming}
                className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition-colors focus:outline-none disabled:opacity-50"
                title="Attach images (PNG, JPG, WebP) or documents (PDF, DOCX, CSV, code)"
                aria-label="Attach images or documents"
              >
                <Paperclip className="h-4 w-4" />
              </button>


              {/* Primary Execution Mode Selector */}
              <ModeSelector
                selectedMode={mode}
                onSelectMode={setMode}
                disabled={isStreaming}
              />

              {/* Tool Center */}
              <ToolCenter
                toolsEnabled={toolsEnabled}
                onToggleMasterTools={setToolsEnabled}
                activeTools={activeTools}
                onToggleTool={handleToggleTool}
                disabled={isStreaming}
              />

              {/* Advanced Controls Popover (Profile, Privacy, Shortcuts) */}
              <AdvancedMenu
                profile={profile}
                onSelectProfile={setProfile}
                privacyMode={privacyMode}
                onSelectPrivacy={setPrivacyMode}
                onTriggerSlash={() => {
                  setSlashMenuOpen(true);
                  if (!input.startsWith("/")) setInput("/");
                }}
                onTriggerMention={() => {
                  setMentionMenuOpen(true);
                  if (!input.includes("@")) setInput(input ? `${input}@` : "@");
                }}
                disabled={isStreaming}
              />
            </div>

            {/* Right Controls: Voice Input, Send Button */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <VoiceButton
                onTranscribe={(speechText) => {
                  setInput(input ? `${input} ${speechText}` : speechText);
                  textareaRef.current?.focus();
                }}
                disabled={isStreaming}
              />

              <SendButton
                state={composerState}
                disabled={!input.trim() && attachments.length === 0}
                onSend={handleSend}
                onStop={onStop}
                onResume={onResume}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
