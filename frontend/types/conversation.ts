import { ChatMessage } from "./chat";

export interface Conversation {
  id: string;
  title: string;
  model?: string;
  provider?: string;
  createdAt: string;
  updatedAt: string;
  isPinned?: boolean;
  parentConversationId?: string;
  messageCount?: number;
  lastMessagePreview?: string;
  messages?: ChatMessage[];
}

export interface ConversationGroup {
  label: "Today" | "Yesterday" | "Previous 7 Days" | "Older";
  conversations: Conversation[];
}
