import { Row } from '@/lib/api';

export const money = (v: unknown) => `${Number(v || 0).toLocaleString('ru-RU')} ₽`;

export const REQUEST_STATUS: Record<string, string> = {
  pending: 'На рассмотрении',
  approved: 'Одобрена',
  declined: 'Отклонена',
  cancelled: 'Отменена',
};

export const STATUS_COLOR: Record<string, string> = {
  pending: '#b8860b',
  approved: '#007a43',
  declined: '#c0392b',
  cancelled: '#8a8a84',
};

export interface PickedItem {
  service_id: number;
  kind: 'license' | 'extra';
  name: string;
  price: number;
  qty: number;
  perDay?: boolean;
}

export const nights = (from: string, to: string): number => {
  if (!from || !to) return 0;
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.max(1, Math.round((b - a) / 86400000));
};

export const itemTotal = (i: PickedItem, days: number, people: number): number => {
  if (i.kind === 'license') return i.price * i.qty;
  if (i.perDay) return i.price * i.qty * Math.max(1, days) * Math.max(1, people);
  return i.price * i.qty;
};

export const grandTotal = (items: PickedItem[], days: number, people: number): number =>
  items.reduce((s, i) => s + itemTotal(i, days, people), 0);

export const isLicense = (r: Row) =>
  String(r.price_group || '') === 'license' || String(r.category || '') === 'Лицензии';

export const isPerDay = (r: Row) => String(r.calc_mode || '') === 'perDayPerHunter';
