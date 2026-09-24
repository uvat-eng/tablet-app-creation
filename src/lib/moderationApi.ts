import { getToken } from '@/lib/api';

const URL_BASE = 'https://functions.poehali.dev/96a0269c-11b2-4ad5-a906-bc2ce26bc042';

export type ReportKind = 'club' | 'chat';

export interface BlockedUser {
  staffId: number;
  name: string;
  createdAt: string;
}

export interface ContentReport {
  id: number;
  reporter: string;
  kind: ReportKind;
  targetId: number;
  authorId: number;
  author: string;
  body: string;
  reason: string;
  comment: string;
  status: string;
  resolvedBy: string;
  createdAt: string;
}

export const REPORT_REASONS = [
  { id: 'spam', label: 'Спам или реклама' },
  { id: 'abuse', label: 'Оскорбления и травля' },
  { id: 'obscene', label: 'Нецензурная лексика' },
  { id: 'illegal', label: 'Призывы к незаконным действиям' },
  { id: 'personal', label: 'Чужие личные данные' },
  { id: 'other', label: 'Другое' },
];

const headers = () => ({
  'Content-Type': 'application/json',
  'X-Auth-Token': getToken(),
});

const post = async (action: string, body: Record<string, unknown>) => {
  const res = await fetch(`${URL_BASE}?action=${action}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Не удалось выполнить действие');
  return data;
};

export const reportMessage = (
  kind: ReportKind,
  id: number,
  reason: string,
  comment: string,
) => post('report', { kind, id, reason, comment });

export const blockUser = (staffId: number) => post('block', { staffId });

export const unblockUser = (staffId: number) => post('unblock', { staffId });

export const deleteOwnMessage = (kind: ReportKind, id: number) =>
  post('delete_own', { kind, id });

export const loadBlocked = async (): Promise<BlockedUser[]> => {
  const res = await fetch(`${URL_BASE}?action=blocks`, { headers: headers() });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.blocked || []) as BlockedUser[];
};

export const loadReports = async (): Promise<ContentReport[]> => {
  const res = await fetch(`${URL_BASE}?action=reports`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Не удалось загрузить жалобы');
  return (data.reports || []) as ContentReport[];
};

export const resolveReport = (id: number, verdict: 'removed' | 'kept') =>
  post('resolve', { id, verdict });
