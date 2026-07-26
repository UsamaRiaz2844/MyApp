export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  avatarUrl?: string | null;
}

export interface OtherUser {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  avatarUrl?: string | null;
  isOnline: boolean;
  lastSeen: string | null;
  weatherTemp?: number | null;
  weatherCity?: string | null;
  weatherCode?: number | null;
  mood?: string | null;
  lat?: number | null;
  lon?: number | null;
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
  replyTo?: string | null; // id of the message this one replies to
  editedAt?: string | null; // set when the message text was edited
}

// messageId -> (userId -> emoji)
export type ReactionMap = Record<string, Record<string, string>>;
