import { supabase } from '../lib/supabase';
import { mapProfile, mapMessage, mapLateStat, todayUTC } from '../lib/mappers';
import type { ChatMessage, ConversationSummary, LateStat, OtherUser } from '../types';

// This module preserves the exact `api.*` surface the UI already uses, but is
// now backed by Supabase (Postgres + RLS) instead of the old REST server.

async function myId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error('Not signed in');
  return id;
}

function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export const api = {
  // --- users ---------------------------------------------------------------
  async searchUsers(q: string): Promise<{ users: OtherUser[] }> {
    const me = await myId();
    const term = q.trim().toLowerCase();
    if (!term) return { users: [] };
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `${term}%`)
      .neq('id', me)
      .limit(15);
    if (error) throw new Error(error.message);
    return { users: (data || []).map(mapProfile) };
  },

  // --- conversations -------------------------------------------------------
  async openConversation(username: string): Promise<{ conversation: { id: string; otherUser: OtherUser } }> {
    const me = await myId();
    const { data: other, error: e1 } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username.trim().toLowerCase())
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!other) throw new Error('User not found');

    const [a, b] = orderPair(me, other.id);
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_a', a)
      .eq('user_b', b)
      .maybeSingle();

    let conversationId = existing?.id as string | undefined;
    if (!conversationId) {
      const { data: created, error: e2 } = await supabase
        .from('conversations')
        .insert({ user_a: a, user_b: b })
        .select('id')
        .single();
      if (e2) throw new Error(e2.message);
      conversationId = created.id;
    }
    return { conversation: { id: conversationId!, otherUser: mapProfile(other) } };
  },

  async listConversations(): Promise<{ conversations: ConversationSummary[] }> {
    const me = await myId();
    const { data: convs, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`user_a.eq.${me},user_b.eq.${me}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);
    const rows = convs || [];
    if (rows.length === 0) return { conversations: [] };

    const otherIds = rows.map((c) => (c.user_a === me ? c.user_b : c.user_a));
    const convIds = rows.map((c) => c.id);

    const [{ data: profiles }, { data: unread }, { data: stats }] = await Promise.all([
      supabase.from('profiles').select('*').in('id', otherIds),
      supabase.from('messages').select('conversation_id').eq('receiver', me).is('seen_at', null),
      supabase.from('late_reply_stats').select('*').in('conversation_id', convIds).eq('date', todayUTC()),
    ]);

    const profileById = new Map((profiles || []).map((p) => [p.id, mapProfile(p)]));
    const unreadByConv = new Map<string, number>();
    for (const m of unread || []) unreadByConv.set(m.conversation_id, (unreadByConv.get(m.conversation_id) || 0) + 1);
    const statByConv = new Map((stats || []).map((s) => [s.conversation_id, mapLateStat(s)]));

    const conversations: ConversationSummary[] = rows.map((c) => {
      const otherId = c.user_a === me ? c.user_b : c.user_a;
      return {
        id: c.id,
        otherUser: profileById.get(otherId) || null,
        lastMessage: c.last_message_text
          ? { text: c.last_message_text, sender: c.last_message_sender, createdAt: c.last_message_at }
          : null,
        unreadCount: unreadByConv.get(c.id) || 0,
        todayLateStats: statByConv.get(c.id) || null,
      };
    });
    return { conversations };
  },

  // --- messages ------------------------------------------------------------
  async getMessages(conversationId: string): Promise<{ messages: ChatMessage[] }> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return { messages: (data || []).map(mapMessage) };
  },

  async markSeen(conversationId: string): Promise<{ ok: boolean }> {
    const me = await myId();
    const { error } = await supabase
      .from('messages')
      .update({ seen_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('receiver', me)
      .is('seen_at', null);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  // --- late-reply stats ----------------------------------------------------
  async getLateStats(conversationId: string): Promise<{ stat: LateStat | null }> {
    const { data, error } = await supabase
      .from('late_reply_stats')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('date', todayUTC())
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { stat: data ? mapLateStat(data) : null };
  },

  async getLateStatsHistory(conversationId: string): Promise<{ stats: LateStat[] }> {
    const { data, error } = await supabase
      .from('late_reply_stats')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('date', { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return { stats: (data || []).map(mapLateStat) };
  },
};
