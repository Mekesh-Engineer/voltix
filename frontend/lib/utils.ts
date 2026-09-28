import { Conversation, ConversationGroup } from "@/types/conversation";

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Failed to copy to clipboard:", err);
    return false;
  }
}

export function groupConversationsByDate(conversations: Conversation[]): ConversationGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const sevenDaysAgo = today - 7 * 86400000;

  const todayList: Conversation[] = [];
  const yesterdayList: Conversation[] = [];
  const sevenDaysList: Conversation[] = [];
  const olderList: Conversation[] = [];

  for (const conv of conversations) {
    const convTime = new Date(conv.updatedAt || conv.createdAt).getTime();
    if (convTime >= today) {
      todayList.push(conv);
    } else if (convTime >= yesterday) {
      yesterdayList.push(conv);
    } else if (convTime >= sevenDaysAgo) {
      sevenDaysList.push(conv);
    } else {
      olderList.push(conv);
    }
  }

  const groups: ConversationGroup[] = [];
  if (todayList.length > 0) groups.push({ label: "Today", conversations: todayList });
  if (yesterdayList.length > 0) groups.push({ label: "Yesterday", conversations: yesterdayList });
  if (sevenDaysList.length > 0) groups.push({ label: "Previous 7 Days", conversations: sevenDaysList });
  if (olderList.length > 0) groups.push({ label: "Older", conversations: olderList });

  return groups;
}

export function formatTimestamp(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

