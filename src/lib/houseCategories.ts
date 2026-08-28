export interface HouseCategory {
  key: string;
  label: string;
  icon: string;
  hint: string;
}

const ALL_CATEGORIES: HouseCategory[] = [
  { key: 'repair', label: 'Ремонт', icon: 'Hammer', hint: 'Материалы и работы' },
  { key: 'food', label: 'Продукты', icon: 'ShoppingCart', hint: 'Закуп продуктов' },
  { key: 'chemistry', label: 'Химия', icon: 'SprayCan', hint: 'Моющие и бытовая химия' },
  { key: 'bedding', label: 'Постельное', icon: 'BedDouble', hint: 'Бельё, полотенца, халаты' },
  { key: 'water', label: 'Водоочистка', icon: 'Droplets', hint: 'Фильтры, картриджи, соль' },
  { key: 'equipment', label: 'Оборудование', icon: 'Wrench', hint: 'Техника и инвентарь' },
  { key: 'lamps', label: 'Лампочки', icon: 'Lightbulb', hint: 'Освещение и электрика' },
  { key: 'firewood', label: 'Дрова', icon: 'Flame', hint: 'Дрова и растопка' },
  { key: 'trophy', label: 'Трофеи', icon: 'Award', hint: 'Изготовление и оформление трофеев' },
  { key: 'other', label: 'Иное', icon: 'Package', hint: 'Прочие расходы по объекту' },
];

const pick = (keys: string[]): HouseCategory[] =>
  keys.map((k) => ALL_CATEGORIES.find((c) => c.key === k)!).filter(Boolean);

export const HOUSE_CATEGORIES = pick([
  'repair', 'food', 'chemistry', 'bedding', 'water', 'equipment', 'lamps', 'other',
]);

export interface Facility {
  key: string;
  base: string;
  index: string;
  title: string;
  lede: string;
  categories: HouseCategory[];
  extraLabel?: string;
  extraPath?: string;
}

export const FACILITIES: Record<string, Facility> = {
  house: {
    key: 'house',
    base: '/house',
    index: 'Раздел / Дом',
    title: 'Дом',
    lede: 'Эксплуатация охотничьего дома: все затраты по веткам с итогом.',
    categories: HOUSE_CATEGORIES,
  },
  hotel: {
    key: 'hotel',
    base: '/hotel',
    index: 'Раздел / Гостиница',
    title: 'Гостиница',
    lede: 'Эксплуатация гостиницы: все затраты по веткам с итогом.',
    categories: HOUSE_CATEGORIES,
  },
  banya: {
    key: 'banya',
    base: '/banya',
    index: 'Раздел / Баня',
    title: 'Баня',
    lede: 'Эксплуатация бани: оборудование, ремонт и дрова.',
    categories: pick(['equipment', 'repair', 'firewood']),
  },
  trophies: {
    key: 'trophies',
    base: '/trophies',
    index: 'Раздел / Трофейный зал',
    title: 'Трофейный зал',
    lede: 'Эксплуатация трофейного зала: оборудование, ремонт и трофеи.',
    categories: pick(['equipment', 'repair', 'trophy']),
    extraLabel: 'Каталог трофеев',
    extraPath: '/trophies/catalog',
  },
};

export const CATEGORY_LABEL = (key: string) =>
  ALL_CATEGORIES.find((c) => c.key === key)?.label || 'Иное';

export const money = (v: unknown) =>
  `${Number(v || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`;