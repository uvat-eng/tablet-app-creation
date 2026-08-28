export interface TransportCategory {
  key: string;
  label: string;
  icon: string;
}

export const TRANSPORT_CATEGORIES: TransportCategory[] = [
  { key: 'oil', label: 'Масла и жидкости', icon: 'Droplet' },
  { key: 'parts', label: 'Запчасти', icon: 'Cog' },
  { key: 'service', label: 'Ремонт на стороне', icon: 'Wrench' },
];

export const TRANSPORT_CATEGORY_LABEL = (key: string) =>
  TRANSPORT_CATEGORIES.find((c) => c.key === key)?.label || 'Запчасти';

export const TRANSPORT_STATUS: Record<string, string> = {
  active: 'В работе',
  repair: 'На ремонте',
  off: 'Не используется',
};

export const money = (v: unknown) =>
  `${Number(v || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`;