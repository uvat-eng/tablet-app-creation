import { Row } from '@/lib/api';

export const DOCS_URL = 'https://functions.poehali.dev/00cd6749-c34b-44dc-8de2-a3cbeed57785';

export const WEAPON_KINDS = [
  { key: 'rifled', label: 'Нарезное' },
  { key: 'smooth', label: 'Гладкоствольное' },
];

export const kindLabel = (k: unknown) =>
  WEAPON_KINDS.find((x) => x.key === String(k))?.label || 'Нарезное';

export const weaponTitle = (w: Row) => {
  const parts = [String(w.name || '')];
  if (w.caliber) parts.push(String(w.caliber));
  return parts.join(', ');
};

export const hasDocs = (g: Row) =>
  Boolean(String(g.hunt_ticket || '').trim()) && Boolean(String(g.roh_number || '').trim());

export const missingWhat = (g: Row): string => {
  const no: string[] = [];
  if (!String(g.hunt_ticket || '').trim()) no.push('охотбилета');
  if (!String(g.roh_number || '').trim()) no.push('РОХа');
  return no.length ? 'нет ' + no.join(' и ') : '';
};

export const ruDate = (v: unknown) => {
  const s = String(v || '').slice(0, 10);
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return d && m && y ? `${d}.${m}.${y}` : s;
};

export const today = () => new Date().toISOString().slice(0, 10);
