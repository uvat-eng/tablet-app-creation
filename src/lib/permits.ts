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
  { name: 'Косуля сибирская (все половозрастные группы)', price: 45000 },
  { name: 'Косуля сибирская, самец во время гона', price: 60000 },
  { name: 'Косуля сибирская, сеголеток', price: 25000 },
  { name: 'Лось (все половозрастные группы)', price: 90000 },
  { name: 'Лось во время гона', price: 120000 },
  { name: 'Кабан взрослый', price: 35000 },
  { name: 'Кабан сеголеток', price: 20000 },
  { name: 'Рысь', price: 30000 },
  { name: 'Волк', price: 0 },
  { name: 'Медведь', price: 80000 },
  { name: 'Куница', price: 3000 },
  { name: 'Енотовидная собака', price: 2000 },
  { name: 'Лисица', price: 1500 },
  { name: 'Заяц', price: 2000 },
  { name: 'Тетерев', price: 3000 },
];

export interface SpeciesRow {
  name: string;
  qty: string;
  sex: string;
  age: string;
  price: string;
  hours: string;
}

export const emptySpecies = (): SpeciesRow => ({
  name: '',
  qty: '1',
  hours: '',
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