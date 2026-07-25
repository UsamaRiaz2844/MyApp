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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'late_reply_stats' }, (p) => {
        const row: any = p.new;
        if (row && row.conversation_id) this.dispatch('late-stats:update', mapLateStat(row));
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

  // ---- typing (per-conversation broadcast) --------------------------------
  private joinConversation(conversationId?: string) {
    if (!conversationId || this.convChannels.has(conversationId)) return;
    const ch = supabase.channel(`typing:${conversationId}`, { config: { broadcast: { self: false } } });
    ch.on('broadcast', { event: 'typing' }, ({ payload }) => this.dispatch('typing', payload)).subscribe();
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
  private sendTyping(payload: { conversationId: string; isTyping: boolean }) {
    const ch = this.convChannels.get(payload?.conversationId);
    ch?.send({ type: 'broadcast', event: 'typing', payload: { ...payload, userId: this.myId } });
  }

  // ---- writes -------------------------------------------------------------
  private async sendMessage(payload: { conversationId: string; text: string }, ack?: (res: any) => void) {
    const text = String(payload?.text || '').trim();
    if (!text || !payload?.conversationId) return ack?.({ error: 'Invalid message' });
    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: payload.conversationId, text })
      .select()
      .single();
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
