import { FarmSettings } from '@/lib/api';

export interface PayData {
  amount: number;
  purpose: string;
  payer?: string;
  docNo?: string;
  docDate?: string;
}

const clean = (v: unknown) =>
  String(v ?? '')
    .replace(/[|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const payReady = (st: Partial<FarmSettings> | null) =>
  Boolean(st && clean(st.org_rs) && clean(st.org_bik) && clean(st.org_name));

export const payMissing = (st: Partial<FarmSettings> | null) => {
  const gaps: string[] = [];
  if (!clean(st?.org_name)) gaps.push('название организации');
  if (!clean(st?.org_rs)) gaps.push('расчётный счёт');
  if (!clean(st?.org_bik)) gaps.push('БИК банка');
  if (!clean(st?.org_bank)) gaps.push('название банка');
  if (!clean(st?.org_inn)) gaps.push('ИНН');
  return gaps;
};

export const buildPayQr = (
  st: Partial<FarmSettings> | null,
  pay: PayData,
): string => {
  const kop = Math.round(Number(pay.amount || 0) * 100);
  const parts: string[] = [
    'ST00012',
    'Name=' + clean(st?.org_full_name || st?.org_name),
    'PersonalAcc=' + clean(st?.org_rs),
    'BankName=' + clean(st?.org_bank),
    'BIC=' + clean(st?.org_bik),
    'CorrespAcc=' + clean(st?.org_ks),
  ];
  if (clean(st?.org_inn)) parts.push('PayeeINN=' + clean(st?.org_inn));
  if (clean(st?.org_kpp)) parts.push('KPP=' + clean(st?.org_kpp));
  if (kop > 0) parts.push('Sum=' + kop);
  parts.push('Purpose=' + clean(pay.purpose).slice(0, 210));
  if (clean(pay.payer)) parts.push('LastName=' + clean(pay.payer));
  if (clean(pay.docNo)) parts.push('DocNo=' + clean(pay.docNo));
  if (clean(pay.docDate)) parts.push('DocDate=' + clean(pay.docDate));
  return parts.join('|');
};
