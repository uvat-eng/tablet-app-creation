import { getToken } from '@/lib/api';

const URL_BASE = 'https://functions.poehali.dev/bdd93fd5-ef1e-4c31-9e6f-72742bcad66d';

export interface AccountClosure {
  id: number;
  login: string;
  name: string;
  reason: string;
  status: string;
  closedAt: string;
  purgeAfter: string;
  daysLeft: number;
  restoredBy: string;
  purgedAt: string;
}

const headers = () => ({
  'Content-Type': 'application/json',
  'X-Auth-Token': getToken(),
});

export const loadClosures = async (): Promise<AccountClosure[]> => {
  const res = await fetch(URL_BASE, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Не удалось загрузить заявки');
  return (data.items || []) as AccountClosure[];
};

const post = async (action: string, id: number) => {
  const res = await fetch(`${URL_BASE}?action=${action}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ id }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Не удалось выполнить действие');
  return data;
};

export const restoreAccount = (id: number) => post('restore', id);

export const purgeAccountNow = (id: number) => post('purge_now', id);
