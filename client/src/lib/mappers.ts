import type { ChatMessage, LateStat, OtherUser } from '../types';

// Raw Postgres row shapes (snake_case) -> the camelCase shapes the UI expects.

export function mapProfile(row: any): OtherUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name || row.username,
    avatarColor: row.avatar_color || '#6366f1',
    avatarUrl: row.avatar_url || null,
    isOnline: !!row.is_online,
    lastSeen: row.last_seen || null,
    weatherTemp: row.weather_temp ?? null,
    weatherCity: row.weather_city ?? null,
    weatherCode: row.weather_code ?? null,
    mood: row.mood ?? null,
    lat: row.lat ?? null,
    lon: row.lon ?? null,
    activity: row.activity ?? null,
    dayScore: row.day_score ?? null,
    dayScoreAt: row.day_score_at ?? null,
  };
}

export function mapMessage(row: any): ChatMessage {
  return {
    id: row.id,
    conversation: row.conversation_id,
    sender: row.sender,
    receiver: row.receiver,
    text: row.text,
    createdAt: row.created_at,
    seenAt: row.seen_at || null,
    delayMs: row.delay_ms ?? null,
    isWhisper: !!row.is_whisper,
    attachmentUrl: row.attachment_url ?? null,
    attachmentType: row.attachment_type ?? null,
    attachmentDurationMs: row.attachment_duration_ms ?? null,
    isEncrypted: !!row.is_encrypted,
    replyTo: row.reply_to ?? null,
    editedAt: row.edited_at ?? null,
  };
}

export function mapLateStat(row: any): LateStat {
  return {
    conversation: row.conversation_id,
    date: row.date,
    active: !!row.active,
    lateMs: (row.late_ms as Record<string, number>) || {},
  };
}

export const todayUTC = () => new Date().toISOString().slice(0, 10);
