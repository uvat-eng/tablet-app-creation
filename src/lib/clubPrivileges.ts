import { Row } from '@/lib/api';

export const CLUB_FEE = 6500;

export const FREE_QUOTA: Record<string, number> = {
  roe: 2,
  boar: 2,
};

export const CLUB_DISCOUNT = 50;

export interface FeeState {
  year: number;
  dueMonths: number;
  paidMonths: number;
  paidSum: number;
  debtMonths: number;
  debt: number;
  months: { month: number; paid: boolean; amount: number }[];
}

export const feeState = (fees: Row[], guestId: number, year: number, fee = CLUB_FEE): FeeState => {
  const mine = fees.filter(
    (f) => Number(f.guest_id) === guestId && Number(f.year) === year,
  );
  const dueMonths =
    year < new Date().getFullYear() ? 12 : new Date().getMonth() + 1;

  const months = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const row = mine.find((f) => Number(f.month) === m);
    return {
      month: m,
      paid: Boolean(row?.paid),
      amount: Number(row?.amount ?? fee),
    };
  });

  const paidMonths = months.filter((m) => m.paid).length;
  const paidSum = months.filter((m) => m.paid).reduce((s, m) => s + m.amount, 0);
  const debtMonths = Math.max(0, dueMonths - paidMonths);

  return {
    year,
    dueMonths,
    paidMonths,
    paidSum,
    debtMonths,
    debt: debtMonths * fee,
    months,
  };
};

export interface BagLine {
  id: number;
  taken_on: string;
  species: string;
  price: number;
  free: boolean;
  charge: number;
  paid: boolean;
  note: string;
}

export interface BagState {
  lines: BagLine[];
  usedFree: Record<string, number>;
  leftFree: Record<string, number>;
  charged: number;
  paid: number;
  owed: number;
  saved: number;
}

export const bagState = (rows: Row[], season: number): BagState => {
  const mine = rows
    .filter((r) => Number(r.season) === season && !r.archived)
    .sort((a, b) => String(a.taken_on || '').localeCompare(String(b.taken_on || '')));

  const used: Record<string, number> = {};
  let charged = 0;
  let paid = 0;
  let saved = 0;

  const lines: BagLine[] = mine.map((r) => {
    const species = String(r.species || '');
    const price = Number(r.price || 0);
    const quota = FREE_QUOTA[species] || 0;
    const taken = used[species] || 0;
    const free = taken < quota;
    used[species] = taken + 1;

    const charge = free ? 0 : Math.round((price * (100 - CLUB_DISCOUNT)) / 100);
    charged += charge;
    saved += free ? price : price - charge;
    if (r.paid_on) paid += charge;

    return {
      id: Number(r.id),
      taken_on: String(r.taken_on || '').slice(0, 10),
      species,
      price,
      free,
      charge,
      paid: Boolean(r.paid_on),
      note: String(r.note || ''),
    };
  });

  const left: Record<string, number> = {};
  Object.entries(FREE_QUOTA).forEach(([k, quota]) => {
    left[k] = Math.max(0, quota - (used[k] || 0));
  });

  return {
    lines,
    usedFree: used,
    leftFree: left,
    charged,
    paid,
    owed: charged - paid,
    saved,
  };
};
