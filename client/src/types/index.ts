export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
}

export interface OtherUser {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  isOnline: boolean;
  lastSeen: string | null;
}

export interface LateStat {
  conversation: string;
  date: string;
  active: boolean;
  lateMs: Record<string, number>;
}

export interface ConversationSummary {
  id: string;
  otherUser: OtherUser | null;
  lastMessage: { text: string; sender: string; createdAt: string } | null;
  unreadCount: number;
  todayLateStats: LateStat | null;
}

export type AttachmentType = 'image' | 'audio';

export interface ChatMessage {
  id: string;
  conversation: string;
  sender: string;
  receiver: string;
  text: string;
  createdAt: string;
  seenAt: string | null;
  delayMs: number | null;
  isWhisper?: boolean;
  attachmentUrl?: string | null;
  attachmentType?: AttachmentType | null;
  attachmentDurationMs?: number | null;
  isEncrypted?: boolean;
}

// messageId -> (userId -> emoji)
export type ReactionMap = Record<string, Record<string, string>>;
