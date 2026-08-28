import { Row, listRows } from '@/lib/api';

export type CalcMode = 'perDayPerHunter' | 'perHunter' | 'flat';
export type PriceGroup = 'stay' | 'license' | 'extra';

export interface PriceItem {
  service_id: number | null;
  name: string;
  category: string;
  unit: string;
  hunters: number;
  days: number;
  tariff: number;
  discount: number;
  note: string;
  group: PriceGroup;
  mode: CalcMode;
}

export const CALC_LABELS: Record<string, string> = {
  perDayPerHunter: 'тариф × дни × охотники',
  perHunter: 'тариф × количество',
  flat: 'фиксированная сумма',
};

export const GROUP_LABELS: Record<string, string> = {
  stay: 'Размещение',
  license: 'Лицензии',
  extra: 'Доп. услуги',
};

export const money = (v: unknown) => `${Number(v || 0).toLocaleString('ru-RU')} ₽`;

export const rowToItem = (r: Row): PriceItem => ({
  service_id: r.id ? Number(r.id) : null,
  name: String(r.name || ''),
  category: String(r.category || ''),
  unit: String(r.unit || ''),
  hunters: 0,
  days: 0,
  tariff: Number(r.price || 0),
  discount: 0,
  note: String(r.note || ''),
  group: (String(r.price_group || 'extra') as PriceGroup) || 'extra',
  mode: (String(r.calc_mode || 'flat') as CalcMode) || 'flat',
});

export const loadPriceItems = async (): Promise<PriceItem[]> => {
  const rows = await listRows('services');
  return rows.filter((r) => r.in_check !== false).map(rowToItem);
};

export const lineSum = (i: PriceItem): number => {
  const base =
    i.mode === 'perDayPerHunter'
      ? i.tariff * (i.days || 0) * (i.hunters || 0)
      : i.mode === 'perHunter'
        ? i.tariff * (i.hunters || 0)
        : i.tariff * (i.hunters || 0 ? 1 : 0);
  return Math.round(base * (1 - (i.discount || 0) / 100));
};
