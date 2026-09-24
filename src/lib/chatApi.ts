import { getToken } from '@/lib/api';

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

export const loadThread = async (guestId?: number) => {
  const url = guestId ? `${CHAT_URL}?guest_id=${guestId}` : CHAT_URL;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as {
    guestId: number;
    guestName: string;
    messages: ChatMessage[];
  };
};

export const sendMessage = async (body: string, guestId?: number) => {
  const url = guestId ? `${CHAT_URL}?guest_id=${guestId}` : CHAT_URL;
  const res = await fetch(url, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ body }),
  });
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as {
    guestId: number;
    guestName: string;
    messages: ChatMessage[];
  };
};

export const loadThreads = async () => {
  const res = await fetch(`${CHAT_URL}?action=threads`, { headers: headers() });
  if (!res.ok) throw new Error(String(res.status));
  const json = await res.json();
  return (json.threads || []) as ChatThread[];
};

export const loadUnread = async () => {
  const res = await fetch(`${CHAT_URL}?action=unread`, { headers: headers() });
  if (!res.ok) return 0;
  const json = await res.json();
  return Number(json.unread || 0);
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