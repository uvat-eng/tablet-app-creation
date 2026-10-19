import { getToken } from '@/lib/api';
import { netFetch, withCache, OfflineError } from '@/lib/offlineStore';
import { addOutbox, registerSender } from '@/lib/chatOutbox';

const URL_BASE = 'https://functions.poehali.dev/225961f2-6b49-4c2d-90b4-0ed65700f726';

export interface ClubMessage {
  id: number;
  staffId: number;
  author: string;
  role: string;
  body: string;
  createdAt: string;
  me: boolean;
}

export interface ClubChatData {
  messages: ClubMessage[];
  lastReadId: number;
  me: { id: number; name: string };
}

const headers = () => ({
  'Content-Type': 'application/json',
  'X-Auth-Token': getToken(),
});

export const loadClubChat = async (): Promise<ClubChatData> =>
  withCache('club_chat', async () => {
    const res = await netFetch(URL_BASE, { headers: headers() });
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as ClubChatData;
  });

const postClub = async (body: string): Promise<ClubChatData> => {
  const res = await netFetch(URL_BASE, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    const e = new Error(String(res.status));
    if (res.status >= 400 && res.status < 500 && ![401, 408, 429].includes(res.status)) {
      e.name = 'Rejected';
    }
    throw e;
  }
  return (await res.json()) as ClubChatData;
};

registerSender('club', async (item) => {
  await postClub(item.body);
});

export const sendClubMessage = async (body: string): Promise<ClubChatData | null> => {
  try {
    return await postClub(body);
  } catch (e) {
    if (e instanceof OfflineError || (e instanceof Error && e.name !== 'Rejected')) {
      addOutbox('club', body);
      return null;
    }
    throw e;
  }
};

export const loadClubUnread = async (): Promise<number> => {
  try {
    const res = await netFetch(`${URL_BASE}?action=unread`, { headers: headers() });
    if (!res.ok) return 0;
    const json = await res.json();
    return Number(json.unread || 0);
  } catch {
    return 0;
  }
};

export const dayLabel = (iso: string): string => {
  if (!iso) return '';
  const d = new Date(iso.endsWith('Z') ? iso : `${iso}Z`);
  const now = new Date();
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Сегодня';
  if (d.toDateString() === y.toDateString()) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' });
};

export const timeLabel = (iso: string): string => {
  if (!iso) return '';
  const d = new Date(iso.endsWith('Z') ? iso : `${iso}Z`);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

const PALETTE = [
  '#c0392b',
  '#0a7d54',
  '#1a5fb4',
  '#8e44ad',
  '#b8860b',
  '#0e7490',
  '#a0522d',
  '#4a5568',
];

export const authorColor = (staffId: number): string =>
  PALETTE[Math.abs(staffId) % PALETTE.length];
