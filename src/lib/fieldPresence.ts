import { getToken } from '@/lib/api';

const FIELD_URL = 'https://functions.poehali.dev/ae48b25e-0650-4817-b5ef-bef14b1c2a45';

export interface Person {
  id: number;
  name: string;
  role: string;
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  battery: number | null;
  sos: boolean;
  note: string;
  ageSec: number;
  me: boolean;
}

export interface PresencePayload {
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number | null;
  heading?: number | null;
  battery?: number | null;
  sos?: boolean;
  sharing?: boolean;
}

const headers = () => ({
  'Content-Type': 'application/json',
  'X-Auth-Token': getToken(),
});

export const pushPresence = async (data: PresencePayload): Promise<Person[]> => {
  const res = await fetch(FIELD_URL, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(String(res.status));
  const json = await res.json();
  return (json.people || []) as Person[];
};

export const fetchPresence = async (): Promise<Person[]> => {
  const res = await fetch(FIELD_URL, { headers: headers() });
  if (!res.ok) throw new Error(String(res.status));
  const json = await res.json();
  return (json.people || []) as Person[];
};

export const stopPresence = async (): Promise<void> => {
  await fetch(FIELD_URL, { method: 'DELETE', headers: headers() });
};

export const fmtAge = (sec: number): string => {
  if (sec < 45) return 'сейчас';
  if (sec < 90) return 'минуту назад';
  if (sec < 3600) return `${Math.round(sec / 60)} мин назад`;
  const h = Math.floor(sec / 3600);
  return h === 1 ? 'час назад' : `${h} ч назад`;
};
