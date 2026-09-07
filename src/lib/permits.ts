export interface GroundOption {
  key: string;
  label: string;
  full: string;
}

export const GROUNDS: GroundOption[] = [
  {
    key: 'krotovsky',
    label: 'Кротовский',
    full: 'Охотугодья 72.3.6 «Кротовский» (ООО «Эксперт-Плюс»)',
  },
  {
    key: 'bobrovsky',
    label: 'Бобровский',
    full: 'Охотугодья 72.3.5 «Бобровский» (ООО «Эксперт-Плюс»)',
  },
];

export interface GameOption {
  name: string;
  price: number;
}

export const GAME_LIST: GameOption[] = [
  { name: 'Косуля сибирская', price: 45000 },
  { name: 'Лось', price: 90000 },
  { name: 'Кабан', price: 35000 },
  { name: 'Медведь', price: 80000 },
  { name: 'Боровая дичь (тетерев, глухарь)', price: 3000 },
  { name: 'Куропатка', price: 2000 },
  { name: 'Водоплавающая дичь (утка, гусь)', price: 2500 },
  { name: 'Заяц', price: 2000 },
  { name: 'Лисица', price: 1500 },
  { name: 'Волк', price: 0 },
];

export interface SpeciesRow {
  name: string;
  qty: string;
  sex: string;
  age: string;
  price: string;
}

export const emptySpecies = (): SpeciesRow => ({
  name: '',
  qty: '1',
  sex: '',
  age: '',
  price: '',
});

export const SEX_OPTIONS = ['', 'самец', 'самка', 'без разделения'];
export const AGE_OPTIONS = ['', 'взрослый', 'до года', 'без разделения'];

export const today = () => new Date().toISOString().slice(0, 10);

export const plusDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const ruDate = (v: unknown) => {
  const s = String(v || '').slice(0, 10);
  if (s.length !== 10) return '—';
  const [y, m, d] = s.split('-');
  return `${d}.${m}.${y}`;
};

export const groundLabel = (key: unknown) =>
  GROUNDS.find((g) => g.key === String(key))?.label || 'Кротовский';

export const rubles = (v: unknown) =>
  Number(v || 0).toLocaleString('ru-RU') + ' \u20bd';
