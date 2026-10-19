import { getToken } from '@/lib/api';
import { netFetch, withCache, OfflineError } from '@/lib/offlineStore';
import { addOutbox, registerSender, OutboxItem } from '@/lib/chatOutbox';

const CHAT_URL = 'https://functions.poehali.dev/8210ebe4-f4da-43d9-9ddf-469fd4251d58';

export interface ChatMessage {
  id: number;
  staffId: number;
  kind: string;
  author: string;
  fromStaff: boolean;
  body: string;
  readGuest: boolean;
  readStaff: boolean;
  createdAt: string;
}

export interface ChatThread {
  guestId: number;
  name: string;
  phone: string;
  clubMember: boolean;
  total: number;
  unread: number;
  lastAt: string;
  lastBody: string;
  lastMine: boolean;
}

const headers = () => ({
  'Content-Type': 'application/json',
  'X-Auth-Token': getToken(),
});

type ThreadData = {
  guestId: number;
  guestName: string;
  messages: ChatMessage[];
};

const rejected = (status: number) => {
  const e = new Error(String(status));
  if (status >= 400 && status < 500 && status !== 401 && status !== 408 && status !== 429) {
    e.name = 'Rejected';
  }
  return e;
};

export const loadThread = async (guestId?: number) =>
  withCache('chat_' + (guestId || 'me'), async () => {
    const url = guestId ? `${CHAT_URL}?guest_id=${guestId}` : CHAT_URL;
    const res = await netFetch(url, { headers: headers() });
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as ThreadData;
  });

const postMessage = async (body: string, guestId?: number) => {
  const url = guestId ? `${CHAT_URL}?guest_id=${guestId}` : CHAT_URL;
  const res = await netFetch(url, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ body }),
  });
  if (!res.ok) throw rejected(res.status);
  return (await res.json()) as ThreadData;
};

registerSender('guest', async (item: OutboxItem) => {
  await postMessage(item.body, item.guestId);
});

export const sendMessage = async (body: string, guestId?: number): Promise<ThreadData | null> => {
  try {
    return await postMessage(body, guestId);
  } catch (e) {
    if (e instanceof OfflineError || (e instanceof Error && e.name !== 'Rejected')) {
      addOutbox('guest', body, guestId);
      return null;
    }
    throw e;
  }
};

export const loadThreads = async () =>
  withCache('chat_threads', async () => {
    const res = await netFetch(`${CHAT_URL}?action=threads`, { headers: headers() });
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json();
    return (json.threads || []) as ChatThread[];
  });

export const loadUnread = async () => {
  try {
    const res = await netFetch(`${CHAT_URL}?action=unread`, { headers: headers() });
    if (!res.ok) return 0;
    const json = await res.json();
    return Number(json.unread || 0);
  } catch {
    return 0;
  }
};

export const fmtWhen = (iso: string): string => {
  if (!iso) return '';
  const d = new Date(iso.endsWith('Z') ? iso : `${iso}Z`);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return time;
  return `${d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })} ${time}`;
};