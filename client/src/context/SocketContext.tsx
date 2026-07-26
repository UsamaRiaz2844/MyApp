import React, { createContext, useContext, useEffect, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { mapMessage, mapLateStat } from '../lib/mappers';
import { useAuth } from './AuthContext';

type Handler = (...args: any[]) => void;

// A tiny drop-in replacement for the old Socket.IO client. It exposes the same
// emit/on/off surface and fires the same events the UI listens for:
//   message:new, message:seen, typing, presence:update, late-stats:update
export interface RealtimeClient {
  emit(event: string, payload?: any, ack?: (res: any) => void): void;
  on(event: string, handler: Handler): void;
  off(event: string, handler: Handler): void;
}

class SupabaseSocket implements RealtimeClient {
  private handlers = new Map<string, Set<Handler>>();
  private dbChannel: RealtimeChannel | null = null;
  private presenceChannel: RealtimeChannel | null = null;
  private convChannels = new Map<string, RealtimeChannel>();

  constructor(private myId: string, token: string) {
    // Authorize Realtime so RLS applies to postgres_changes.
    supabase.realtime.setAuth(token);
    this.setupDb();
    this.setupPresence();
  }

  // ---- event bus ----------------------------------------------------------
  on(event: string, handler: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
  }
  off(event: string, handler: Handler) {
    this.handlers.get(event)?.delete(handler);
  }
  private dispatch(event: string, ...args: any[]) {
    this.handlers.get(event)?.forEach((h) => {
      try {
        h(...args);
      } catch (e) {
        console.error(`handler for ${event} failed`, e);
      }
    });
  }

  emit(event: string, payload?: any, ack?: (res: any) => void) {
    switch (event) {
      case 'message:send':
        this.sendMessage(payload, ack);
        break;
      case 'message:seen':
        this.markSeen(payload?.conversationId);
        break;
      case 'typing':
        this.sendTyping(payload);
        break;
      case 'nudge':
        this.sendOnConv(payload?.conversationId, 'nudge', { conversationId: payload?.conversationId, from: this.myId });
        break;
      case 'effect':
        this.sendOnConv(payload?.conversationId, 'effect', {
          conversationId: payload?.conversationId,
          from: this.myId,
          kind: payload?.kind,
        });
        break;
      case 'conversation:join':
        this.joinConversation(payload);
        break;
      case 'conversation:leave':
        this.leaveConversation(payload);
        break;
    }
  }

  // ---- database realtime (messages + late stats) --------------------------
  private setupDb() {
    this.dbChannel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p) => {
        const row: any = p.new;
        if (row.sender === this.myId || row.receiver === this.myId) this.dispatch('message:new', mapMessage(row));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (p) => {
        const row: any = p.new;
        // The other person marked MY message as seen.
        if (row.seen_at && row.sender === this.myId) {
          this.dispatch('message:seen', { conversationId: row.conversation_id, seenBy: row.receiver, seenAt: row.seen_at });
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (p) => {
        const row: any = p.old;
        if (row && row.id) this.dispatch('message:deleted', { id: row.id, conversationId: row.conversation_id });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'late_reply_stats' }, (p) => {
        const row: any = p.new;
        if (row && row.conversation_id) this.dispatch('late-stats:update', mapLateStat(row));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, (p: any) => {
        const row: any = p.eventType === 'DELETE' ? p.old : p.new;
        if (!row) return;
        this.dispatch('reaction:update', {
          messageId: row.message_id,
          userId: row.user_id,
          emoji: p.eventType === 'DELETE' ? null : row.emoji,
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, (p) => {
        const row: any = p.new;
        if (row && row.id) this.dispatch('conversation:updated', { id: row.id, theme: row.theme });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'conversations' }, (p) => {
        const row: any = p.old;
        if (row && row.id) this.dispatch('conversation:deleted', { id: row.id });
      })
      .subscribe();
  }

  // ---- presence (online status) -------------------------------------------
  private setupPresence() {
    this.presenceChannel = supabase.channel('online-users', { config: { presence: { key: this.myId } } });
    this.presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = this.presenceChannel!.presenceState();
        Object.keys(state).forEach((userId) => this.dispatch('presence:update', { userId, isOnline: true, lastSeen: null }));
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        this.dispatch('presence:update', { userId: key, isOnline: true, lastSeen: null });
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        this.dispatch('presence:update', { userId: key, isOnline: false, lastSeen: new Date().toISOString() });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await this.presenceChannel!.track({ user_id: this.myId, online_at: new Date().toISOString() });
          supabase.from('profiles').update({ is_online: true, last_seen: new Date().toISOString() }).eq('id', this.myId).then();
        }
      });
  }

  // ---- per-conversation channel: typing preview, nudge, effects, co-presence
  private joinConversation(conversationId?: string) {
    if (!conversationId || this.convChannels.has(conversationId)) return;
    const ch = supabase.channel(`conv:${conversationId}`, {
      config: { broadcast: { self: false }, presence: { key: this.myId } },
    });
    ch.on('broadcast', { event: 'typing' }, ({ payload }) => this.dispatch('typing', payload))
      .on('broadcast', { event: 'nudge' }, ({ payload }) => this.dispatch('nudge', payload))
      .on('broadcast', { event: 'effect' }, ({ payload }) => this.dispatch('effect', payload))
      .on('presence', { event: 'sync' }, () => {
        const keys = Object.keys(ch.presenceState());
        const bothHere = keys.some((k) => k !== this.myId);
        this.dispatch('copresence', { conversationId, bothHere });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await ch.track({ user_id: this.myId });
      });
    this.convChannels.set(conversationId, ch);
  }
  private leaveConversation(conversationId?: string) {
    if (!conversationId) return;
    const ch = this.convChannels.get(conversationId);
    if (ch) {
      supabase.removeChannel(ch);
      this.convChannels.delete(conversationId);
    }
  }
  private sendTyping(payload: { conversationId: string; isTyping: boolean; text?: string }) {
    this.sendOnConv(payload?.conversationId, 'typing', { ...payload, userId: this.myId });
  }
  private sendOnConv(conversationId: string | undefined, event: string, payload: any) {
    if (!conversationId) return;
    const ch = this.convChannels.get(conversationId);
    ch?.send({ type: 'broadcast', event, payload });
  }

  // ---- writes -------------------------------------------------------------
  private async sendMessage(
    payload: {
      conversationId: string;
      text: string;
      isWhisper?: boolean;
      attachmentUrl?: string;
      attachmentType?: 'image' | 'audio';
      attachmentDurationMs?: number;
      isEncrypted?: boolean;
      encMarker?: 'greet' | 'bye' | null;
    },
    ack?: (res: any) => void
  ) {
    const text = String(payload?.text || '').trim();
    const hasAttachment = !!payload?.attachmentUrl;
    // A message needs either text or an attachment.
    if ((!text && !hasAttachment) || !payload?.conversationId) return ack?.({ error: 'Invalid message' });
    // Only send the optional columns when set, so normal messaging still works
    // even if the features.sql / media.sql / encryption.sql migrations haven't
    // been run yet.
    const row: any = { conversation_id: payload.conversationId, text };
    if (payload.isWhisper) row.is_whisper = true;
    if (hasAttachment) {
      row.attachment_url = payload.attachmentUrl;
      row.attachment_type = payload.attachmentType;
      if (payload.attachmentDurationMs != null) row.attachment_duration_ms = payload.attachmentDurationMs;
    }
    if (payload.isEncrypted) {
      row.is_encrypted = true;
      if (payload.encMarker) row.enc_marker = payload.encMarker;
    }
    const { data, error } = await supabase.from('messages').insert(row).select().single();
    if (error || !data) return ack?.({ error: error?.message || 'Failed to send message' });
    ack?.({ message: mapMessage(data) });
  }

  private async markSeen(conversationId?: string) {
    if (!conversationId) return;
    await supabase
      .from('messages')
      .update({ seen_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('receiver', this.myId)
      .is('seen_at', null);
  }

  // ---- teardown -----------------------------------------------------------
  async destroy() {
    try {
      await supabase.from('profiles').update({ is_online: false, last_seen: new Date().toISOString() }).eq('id', this.myId);
    } catch {
      /* ignore */
    }
    if (this.dbChannel) supabase.removeChannel(this.dbChannel);
    if (this.presenceChannel) supabase.removeChannel(this.presenceChannel);
    this.convChannels.forEach((ch) => supabase.removeChannel(ch));
    this.convChannels.clear();
    this.handlers.clear();
  }
}

const SocketContext = createContext<RealtimeClient | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<RealtimeClient | null>(null);

  useEffect(() => {
    if (!token || !user) {
      setSocket(null);
      return;
    }
    const s = new SupabaseSocket(user.id, token);
    setSocket(s);

    const markAway = () => {
      supabase.from('profiles').update({ is_online: false, last_seen: new Date().toISOString() }).eq('id', user.id).then();
    };
    window.addEventListener('beforeunload', markAway);

    return () => {
      window.removeEventListener('beforeunload', markAway);
      s.destroy();
      setSocket(null);
    };
  }, [token, user?.id]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
