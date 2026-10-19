import { initCache } from '@/lib/localCache';
import { nativeGet, nativeSet } from '@/lib/nativeStore';

export type ChatChannel = 'guest' | 'club';

export interface OutboxItem {
  id: string;
  channel: ChatChannel;
  guestId?: number;
  body: string;
  at: number;
}

const KEY = 'hb_chat_outbox';
const listeners = new Set<() => void>();

let items: OutboxItem[] | null = null;

const load = (): OutboxItem[] => {
  if (items) return items;
  try {
    const raw = localStorage.getItem(KEY);
    items = raw ? (JSON.parse(raw) as OutboxItem[]) : [];
  } catch {
    items = [];
  }
  return items;
};

const save = () => {
  const raw = JSON.stringify(items || []);
  try {
    localStorage.setItem(KEY, raw);
  } catch {
    /* переполнено */
  }
  nativeSet(KEY, raw);
  listeners.forEach((fn) => fn());
};

let restored: Promise<void> | null = null;

export const restoreOutbox = () => {
  if (!restored) {
    restored = (async () => {
      await initCache();
      if (load().length) return;
      const raw = await nativeGet(KEY);
      if (!raw) return;
      try {
        const saved = JSON.parse(raw) as OutboxItem[];
        if (Array.isArray(saved) && saved.length) {
          items = saved;
          save();
        }
      } catch {
        /* повреждено */
      }
    })();
  }
  return restored;
};

export const onOutbox = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const outboxFor = (channel: ChatChannel, guestId?: number) =>
  load().filter((m) => m.channel === channel && (channel === 'club' || m.guestId === guestId));

export const outboxCount = () => load().length;

export const addOutbox = (channel: ChatChannel, body: string, guestId?: number) => {
  const item: OutboxItem = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    channel,
    guestId,
    body,
    at: Date.now(),
  };
  items = [...load(), item];
  save();
  return item;
};

const removeOutbox = (id: string) => {
  items = load().filter((m) => m.id !== id);
  save();
};

type Sender = (item: OutboxItem) => Promise<void>;
const senders: Partial<Record<ChatChannel, Sender>> = {};

export const registerSender = (channel: ChatChannel, fn: Sender) => {
  senders[channel] = fn;
};

let flushing: Promise<number> | null = null;

export const flushOutbox = (): Promise<number> => {
  if (flushing) return flushing;
  flushing = (async () => {
    await restoreOutbox();
    let sent = 0;
    for (const item of [...load()]) {
      const send = senders[item.channel];
      if (!send) continue;
      try {
        await send(item);
        removeOutbox(item.id);
        sent += 1;
      } catch (e) {
        if (e instanceof Error && e.name === 'Rejected') {
          removeOutbox(item.id);
          continue;
        }
        break;
      }
    }
    return sent;
  })().finally(() => {
    flushing = null;
  });
  return flushing;
};
