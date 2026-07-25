// Normalize the configured backend URL:
//  - empty  -> local dev default
//  - "host.onrender.com" (no scheme) -> assume https:// (Render cross-service
//    references provide a bare hostname)
//  - strip any trailing slashes so `${API_URL}${path}` never double-slashes
function normalizeApiUrl(raw?: string): string {
  const val = (raw || '').trim();
  if (!val) return 'http://localhost:4000';
  const withScheme = /^https?:\/\//i.test(val) ? val : `https://${val}`;
  return withScheme.replace(/\/+$/, '');
}

export const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL as string | undefined);

function getToken() {
  return localStorage.getItem('pronto_token');
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export const api = {
  register: (username: string, password: string) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }),
  login: (username: string, password: string) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => request('/api/auth/me'),
  searchUsers: (q: string) => request(`/api/users/search?q=${encodeURIComponent(q)}`),
  listConversations: () => request('/api/conversations'),
  openConversation: (username: string) =>
    request('/api/conversations', { method: 'POST', body: JSON.stringify({ username }) }),
  getMessages: (conversationId: string, before?: string) =>
    request(`/api/messages/${conversationId}${before ? `?before=${encodeURIComponent(before)}` : ''}`),
  markSeen: (conversationId: string) => request(`/api/messages/${conversationId}/seen`, { method: 'POST' }),
  getLateStats: (conversationId: string, date?: string) =>
    request(`/api/messages/${conversationId}/late-stats${date ? `?date=${date}` : ''}`),
  getLateStatsHistory: (conversationId: string) => request(`/api/messages/${conversationId}/late-stats/history`),
};
