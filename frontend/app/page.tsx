"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ChatWorkspace } from "@/components/chat/ChatWorkspace";
import { SlideOver } from "@/components/layout/SlideOver";
import { SourceInspector } from "@/components/sources/SourceInspector";
import { CommandPalette } from "@/components/command/CommandPalette";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { AgentControlCenter } from "@/components/agent/AgentControlCenter";
import { ApprovalModal } from "@/components/agent/ApprovalModal";
import { ArtifactsDrawer } from "@/components/agent/ArtifactsDrawer";
import { useConversations } from "@/hooks/useConversations";
import { useModels } from "@/hooks/useModels";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useChat } from "@/hooks/useChat";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { useTheme } from "@/hooks/useTheme";
import { useAgent } from "@/hooks/useAgent";
import { estimateTokens } from "@/lib/utils";
import { CitationItem } from "@/types/chat";

export default function ChatPage() {
  const [activeId, setActiveId] = useState<string | undefined>();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [agentControlOpen, setAgentControlOpen] = useState(false);
  const [artifactsDrawerOpen, setArtifactsDrawerOpen] = useState(false);
  const [activeCitation, setActiveCitation] = useState<CitationItem | null>(null);

  const { theme, toggleTheme, setTheme } = useTheme();
  const cmdPalette = useCommandPalette();
  const { conversations, renameChat, pinChat, deleteChat, refreshConversations } = useConversations();
  const { models, selectedModel, selectedProvider, ollamaActive, selectModel } = useModels();
  const { attachments, uploading, handleUpload, removeAttachment, clearAttachments } = useFileUpload(activeId);
  const chat = useChat(activeId, (id) => {
    setActiveId(id);
    refreshConversations();
  });
  const agent = useAgent();

  const activeConv = conversations.find((c) => c.id === activeId);
  const currentTokens = chat.messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
  const selectChat = (id?: string) => {
    setActiveId(id);
    clearAttachments();
  };

  const isStreamingAny = chat.isStreaming || agent.isRunning;
  const activeApproval = chat.pendingApproval || agent.pendingApproval;

  return (
    <>
      <AppShell
        sidebar={
          <Sidebar
            conversations={conversations}
            activeId={activeId}
            onSelectConversation={selectChat}
            onNewChat={() => selectChat(undefined)}
            onRenameChat={renameChat}
            onTogglePin={pinChat}
            onDeleteChat={async (id) => {
              await deleteChat(id);
              if (activeId === id) setActiveId(undefined);
            }}
            isOpenMobile={mobileOpen}
            onCloseMobile={() => setMobileOpen(false)}
            onOpenSettings={() => setSettingsOpen(true)}
            models={models}
            selectedModel={selectedModel}
            onSelectModel={selectModel}
            ollamaActive={ollamaActive}
          />
        }
        header={
          <Header
            title={activeConv?.title || "New Chat"}
            theme={theme}
            onThemeToggle={toggleTheme}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenCommandPalette={cmdPalette.open}
            onToggleSidebarMobile={() => setMobileOpen((v) => !v)}
            models={models}
            selectedModel={selectedModel}
            onSelectModel={selectModel}
            ollamaActive={ollamaActive}
            currentTokens={currentTokens}
            onOpenAgentControl={() => setAgentControlOpen(true)}
            onOpenArtifacts={() => setArtifactsDrawerOpen(true)}
            isAgentRunning={isStreamingAny}
          />
        }
        slideOver={
          <SlideOver
            isOpen={Boolean(activeCitation)}
            onClose={() => setActiveCitation(null)}
            title="Source Context"
          >
            <SourceInspector citation={activeCitation} onClose={() => setActiveCitation(null)} />
          </SlideOver>
        }
        isSlideOverOpen={Boolean(activeCitation)}
      >
        <ChatWorkspace
          messages={chat.messages}
          isStreaming={isStreamingAny}
          streamingStatus={
            chat.streamingStatus ||
            (agent.isRunning
              ? agent.isPaused
                ? "Agent paused"
                : agent.phase
              : null)
          }
          streamingStage={chat.streamingStage}
          onStop={() => {
            if (agent.isRunning) {
              agent.cancelAgent();
            }
            chat.stopGeneration();
          }}
          onPause={agent.isRunning ? agent.pauseAgent : undefined}
          onResume={agent.isPaused ? agent.resumeAgent : undefined}
          pendingApproval={activeApproval}
          onRespondApproval={(approved) => {
            if (chat.pendingApproval) {
              chat.respondApproval(approved);
            } else if (agent.pendingApproval) {
              agent.respondApproval(approved);
            }
          }}
          currentTokens={currentTokens}
          maxTokens={8192}
          onBranch={chat.branchFromMessage}
          onSelectCitation={setActiveCitation}
          models={models}
          selectedModel={selectedModel}
          selectedProvider={selectedProvider}
          ollamaActive={ollamaActive}
          onSelectModel={selectModel}
          attachments={attachments}
          uploading={uploading}
          onUploadFile={handleUpload}
          onRemoveAttachment={removeAttachment}
          onSendMessage={(msg, att, tools, mode, activeToolsList, profile) => {
            const attachmentDetails = attachments.map((a) => {
              const name = (a.originalName || "").toLowerCase();
              const isImg =
                name.endsWith(".png") ||
                name.endsWith(".jpg") ||
                name.endsWith(".jpeg") ||
                name.endsWith(".webp") ||
                name.endsWith(".gif") ||
                name.endsWith(".bmp") ||
                name.endsWith(".svg") ||
                name.endsWith(".ico") ||
                name.endsWith(".avif") ||
                (a.mimeType || "").startsWith("image/");
              return {
                id: a.id,
                filename: a.filename,
                originalName: a.originalName,
                mimeType: a.mimeType,
                size: a.size,
                formattedSize: a.formattedSize,
                isImage: isImg,
              };
            });

            chat.sendMessage({
              message: msg,
              conversationId: activeId,
              model: selectedModel === "auto" ? undefined : selectedModel,
              provider: selectedProvider,
              attachments: att,
              attachmentDetails: attachmentDetails,
              toolsEnabled: tools,
              mode: mode,
              tools: activeToolsList,
              profile: profile,
            });
            clearAttachments();
          }}

          onRegenerate={() => {
            const last = [...chat.messages].reverse().find((m) => m.role === "user");
            if (last) chat.regenerateResponse(last.content, selectedModel, selectedProvider);
          }}
        />
      </AppShell>
      <CommandPalette
        isOpen={cmdPalette.isOpen}
        onClose={cmdPalette.close}
        conversations={conversations}
        onSelectConversation={selectChat}
        onNewChat={() => selectChat(undefined)}
        models={models}
        selectedModel={selectedModel}
        onSelectModel={selectModel}
        onOpenSettings={() => setSettingsOpen(true)}
        theme={theme}
        onThemeToggle={toggleTheme}
      />
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onThemeChange={setTheme}
      />
      <AgentControlCenter
        isOpen={agentControlOpen}
        onClose={() => setAgentControlOpen(false)}
        isRunning={agent.isRunning}
        isPaused={agent.isPaused}
        goal={agent.goal}
        phase={agent.phase}
        model={agent.model}
        steps={agent.steps}
        artifacts={agent.artifacts}
        runtimeSeconds={agent.runtimeSeconds}
        finalOutput={agent.finalOutput}
        onPause={agent.pauseAgent}
        onResume={agent.resumeAgent}
        onCancel={agent.cancelAgent}
        onStartNewTask={(taskGoal) =>
          agent.startAgent(taskGoal, selectedModel, attachments.map((a) => a.id))
        }
      />
      <ApprovalModal
        approval={activeApproval}
        onRespond={(approved) => {
          if (chat.pendingApproval) {
            chat.respondApproval(approved);
          } else if (agent.pendingApproval) {
            agent.respondApproval(approved);
          }
        }}
      />
      <ArtifactsDrawer
        isOpen={artifactsDrawerOpen}
        onClose={() => setArtifactsDrawerOpen(false)}
      />
    </>
  );
}
