export interface HouseCategory {
  key: string;
  label: string;
  icon: string;
  hint: string;
}

export const HOUSE_CATEGORIES: HouseCategory[] = [
  { key: 'repair', label: 'Ремонт', icon: 'Hammer', hint: 'Материалы и работы' },
  { key: 'food', label: 'Продукты', icon: 'ShoppingCart', hint: 'Закуп продуктов' },
  { key: 'chemistry', label: 'Химия', icon: 'SprayCan', hint: 'Моющие и бытовая химия' },
  { key: 'bedding', label: 'Постельное', icon: 'BedDouble', hint: 'Бельё, полотенца, халаты' },
  { key: 'water', label: 'Водоочистка', icon: 'Droplets', hint: 'Фильтры, картриджи, соль' },
  { key: 'equipment', label: 'Оборудование', icon: 'Wrench', hint: 'Техника и инвентарь' },
  { key: 'lamps', label: 'Лампочки', icon: 'Lightbulb', hint: 'Освещение и электрика' },
  { key: 'other', label: 'Иное', icon: 'Package', hint: 'Прочие расходы по объекту' },
];

export interface Facility {
  key: string;
  base: string;
  index: string;
  title: string;
  lede: string;
}

export const FACILITIES: Record<string, Facility> = {
  house: {
    key: 'house',
    base: '/house',
    index: 'Раздел / Дом',
    title: 'Дом',
    lede: 'Эксплуатация охотничьего дома: все затраты по веткам с итогом.',
  },
  hotel: {
    key: 'hotel',
    base: '/hotel',
    index: 'Раздел / Гостиница',
    title: 'Гостиница',
    lede: 'Эксплуатация гостиницы: все затраты по веткам с итогом.',
  },
};

export const CATEGORY_LABEL = (key: string) =>
  HOUSE_CATEGORIES.find((c) => c.key === key)?.label || 'Иное';

export const money = (v: unknown) =>
  `${Number(v || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`;