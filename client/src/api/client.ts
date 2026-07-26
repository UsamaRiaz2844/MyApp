import { supabase } from '../lib/supabase';
import { mapProfile, mapMessage, mapLateStat, todayUTC } from '../lib/mappers';
import type { ChatMessage, ConversationSummary, LateStat, OtherUser, ReactionMap } from '../types';

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
  // Loads the most recent `limit` messages (returned oldest→newest) instead of
  // the entire history, so opening a chat stays fast as it grows.
  async getMessages(conversationId: string, limit = 40): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    const rows = (data || []).slice().reverse();
    return { messages: rows.map(mapMessage), hasMore: (data || []).length === limit };
  },

  // Older page: messages strictly before `beforeIso`, returned oldest→newest.
  async getMessagesBefore(
    conversationId: string,
    beforeIso: string,
    limit = 40
  ): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .lt('created_at', beforeIso)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    const rows = (data || []).slice().reverse();
    return { messages: rows.map(mapMessage), hasMore: (data || []).length === limit };
  },

  // Catch-up: only messages newer than what we already have (cheap poll).
  async getMessagesSince(conversationId: string, sinceIso: string): Promise<{ messages: ChatMessage[] }> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .gt('created_at', sinceIso)
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

  // --- theme ---------------------------------------------------------------
  async getTheme(conversationId: string): Promise<{ theme: string | null }> {
    const { data } = await supabase.from('conversations').select('theme').eq('id', conversationId).maybeSingle();
    return { theme: data?.theme ?? null };
  },
  async setTheme(conversationId: string, theme: string): Promise<void> {
    const { error } = await supabase.from('conversations').update({ theme }).eq('id', conversationId);
    if (error) throw new Error(error.message);
  },

  // --- reactions -----------------------------------------------------------
  async getReactions(conversationId: string): Promise<{ reactions: ReactionMap }> {
    const { data } = await supabase
      .from('message_reactions')
      .select('message_id,user_id,emoji')
      .eq('conversation_id', conversationId);
    const map: ReactionMap = {};
    for (const r of data || []) {
      (map[r.message_id] ||= {})[r.user_id] = r.emoji;
    }
    return { reactions: map };
  },
  async setReaction(messageId: string, conversationId: string, emoji: string): Promise<void> {
    const me = await myId();
    const { error } = await supabase
      .from('message_reactions')
      .upsert(
        { message_id: messageId, user_id: me, conversation_id: conversationId, emoji, updated_at: new Date().toISOString() },
        { onConflict: 'message_id,user_id' }
      );
    if (error) throw new Error(error.message);
  },
  async removeReaction(messageId: string): Promise<void> {
    const me = await myId();
    await supabase.from('message_reactions').delete().eq('message_id', messageId).eq('user_id', me);
  },

  // --- media uploads -------------------------------------------------------
  // Uploads a file (image or recorded audio) to the chat-media bucket under
  // `<conversationId>/<uuid>.<ext>` and returns its public URL. Requires the
  // media.sql migration (bucket + storage policies) to have been run.
  async uploadMedia(conversationId: string, file: Blob, ext: string): Promise<{ url: string; path: string }> {
    const rand =
      (globalThis.crypto as any)?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const path = `${conversationId}/${rand}.${ext}`;
    const { error } = await supabase.storage
      .from('chat-media')
      .upload(path, file, { contentType: (file as File).type || undefined, upsert: false });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from('chat-media').getPublicUrl(path);
    return { url: data.publicUrl, path };
  },

  // --- profile picture -----------------------------------------------------
  // Uploads an avatar to the public `avatars` bucket under <uid>/<uuid>.<ext>
  // and points the profile at it. Requires the profiles.sql migration.
  async uploadAvatar(file: Blob, ext: string): Promise<{ url: string }> {
    const me = await myId();
    const rand =
      (globalThis.crypto as any)?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const path = `${me}/${rand}.${ext}`;
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { contentType: (file as File).type || undefined, upsert: true });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const { error: e2 } = await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', me);
    if (e2) throw new Error(e2.message);
    return { url: data.publicUrl };
  },

  // --- all-time message counts (survive deleting the chat) -----------------
  async getMessageCounts(otherUserId: string): Promise<{ mine: number; theirs: number; total: number }> {
    const me = await myId();
    const [a, b] = orderPair(me, otherUserId);
    const { data } = await supabase
      .from('pair_message_counts')
      .select('count_a, count_b')
      .eq('user_a', a)
      .eq('user_b', b)
      .maybeSingle();
    const countA = data?.count_a ?? 0;
    const countB = data?.count_b ?? 0;
    const mine = me === a ? countA : countB;
    const theirs = me === a ? countB : countA;
    return { mine, theirs, total: countA + countB };
  },

  // --- weather -------------------------------------------------------------
  async updateWeather(temp: number, city: string, code: number): Promise<void> {
    const me = await myId();
    await supabase
      .from('profiles')
      .update({ weather_temp: temp, weather_city: city, weather_code: code, weather_at: new Date().toISOString() })
      .eq('id', me);
  },

  // --- checklist / plans ---------------------------------------------------
  async listChecklist(conversationId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  },
  async addChecklist(conversationId: string, text: string): Promise<void> {
    const { error } = await supabase.from('checklist_items').insert({ conversation_id: conversationId, text });
    if (error) throw new Error(error.message);
  },
  async toggleChecklist(id: string, done: boolean): Promise<void> {
    await supabase.from('checklist_items').update({ done }).eq('id', id);
  },
  async deleteChecklist(id: string): Promise<void> {
    await supabase.from('checklist_items').delete().eq('id', id);
  },

  // --- expenses (who owes who) ---------------------------------------------
  async listExpenses(conversationId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },
  async addExpense(conversationId: string, payer: string, amount: number, note: string): Promise<void> {
    const { error } = await supabase.from('expenses').insert({ conversation_id: conversationId, payer, amount, note });
    if (error) throw new Error(error.message);
  },
  async deleteExpense(id: string): Promise<void> {
    await supabase.from('expenses').delete().eq('id', id);
  },

  // --- polls ---------------------------------------------------------------
  async listPolls(conversationId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('polls')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },
  async createPoll(conversationId: string, question: string, options: string[]): Promise<void> {
    const { error } = await supabase.from('polls').insert({ conversation_id: conversationId, question, options });
    if (error) throw new Error(error.message);
  },
  async votePoll(id: string, votes: Record<string, number>): Promise<void> {
    await supabase.from('polls').update({ votes }).eq('id', id);
  },
  async deletePoll(id: string): Promise<void> {
    await supabase.from('polls').delete().eq('id', id);
  },

  // --- activity ("wyd") + daily score --------------------------------------
  async updateActivity(activity: string | null): Promise<void> {
    const me = await myId();
    await supabase.from('profiles').update({ activity }).eq('id', me);
  },
  async updateDayScore(score: number): Promise<void> {
    const me = await myId();
    await supabase.from('profiles').update({ day_score: score, day_score_at: todayUTC() }).eq('id', me);
  },

  // --- games ---------------------------------------------------------------
  async getActiveGame(conversationId: string, type: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('type', type)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },
  async createGame(conversationId: string, type: string, state: any, turn: string | null): Promise<any> {
    const { data, error } = await supabase
      .from('games')
      .insert({ conversation_id: conversationId, type, state, turn })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
  async updateGame(id: string, patch: { state?: any; turn?: string | null; winner?: string | null; status?: string }): Promise<void> {
    const { error } = await supabase
      .from('games')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },
  async getScores(conversationId: string): Promise<Record<string, number>> {
    const { data } = await supabase.from('game_scores').select('user_id, wins').eq('conversation_id', conversationId);
    const out: Record<string, number> = {};
    (data || []).forEach((r: any) => (out[r.user_id] = r.wins));
    return out;
  },
  async bumpScore(conversationId: string, userId: string): Promise<void> {
    await supabase.rpc('bump_game_score', { p_conv: conversationId, p_user: userId });
  },

  // --- pet (shared chat cat) -----------------------------------------------
  async getPet(conversationId: string): Promise<{ streak: number; xp: number }> {
    try {
      const { data } = await supabase
        .from('conversations')
        .select('pet_streak, pet_xp')
        .eq('id', conversationId)
        .maybeSingle();
      return { streak: data?.pet_streak ?? 0, xp: data?.pet_xp ?? 0 };
    } catch {
      return { streak: 0, xp: 0 };
    }
  },

  // --- location ------------------------------------------------------------
  async updateLocation(lat: number, lon: number): Promise<void> {
    const me = await myId();
    await supabase.from('profiles').update({ lat, lon }).eq('id', me);
  },

  // --- mood ----------------------------------------------------------------
  async updateMood(mood: string | null): Promise<void> {
    const me = await myId();
    await supabase.from('profiles').update({ mood }).eq('id', me);
  },

  // --- stop / freeze chat --------------------------------------------------
  async getStopped(conversationId: string): Promise<{ stoppedBy: string | null }> {
    try {
      const { data } = await supabase
        .from('conversations')
        .select('stopped_by')
        .eq('id', conversationId)
        .maybeSingle();
      return { stoppedBy: data?.stopped_by ?? null };
    } catch {
      return { stoppedBy: null };
    }
  },
  async setStopped(conversationId: string, stoppedBy: string | null): Promise<void> {
    const { error } = await supabase.from('conversations').update({ stopped_by: stoppedBy }).eq('id', conversationId);
    if (error) throw new Error(error.message);
  },

  // --- encryption ----------------------------------------------------------
  // Per-conversation E2EE metadata: a public PBKDF2 salt and a verifier token
  // (the shared passphrase never touches the server). Reads degrade gracefully
  // to null if the encryption.sql migration hasn't been run.
  async getEncryption(conversationId: string): Promise<{ salt: string | null; check: string | null }> {
    try {
      const { data } = await supabase
        .from('conversations')
        .select('enc_salt, enc_check')
        .eq('id', conversationId)
        .maybeSingle();
      return { salt: data?.enc_salt ?? null, check: data?.enc_check ?? null };
    } catch {
      return { salt: null, check: null };
    }
  },
  async enableEncryption(conversationId: string, salt: string, check: string): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .update({ enc_salt: salt, enc_check: check })
      .eq('id', conversationId);
    if (error) throw new Error(error.message);
  },

  // --- edit ----------------------------------------------------------------
  // Update a message's text in place and stamp edited_at. Requires the edit.sql
  // migration (edited_at column + sender-update policy).
  async editMessage(messageId: string, text: string, isEncrypted: boolean): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ text, is_encrypted: isEncrypted, edited_at: new Date().toISOString() })
      .eq('id', messageId);
    if (error) throw new Error(error.message);
  },

  // --- deletes -------------------------------------------------------------
  async deleteMessage(messageId: string): Promise<void> {
    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    if (error) throw new Error(error.message);
  },
  async deleteConversation(conversationId: string): Promise<void> {
    const { error } = await supabase.from('conversations').delete().eq('id', conversationId);
    if (error) throw new Error(error.message);
  },
};
