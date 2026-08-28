import { HOUSE_CATEGORIES, FACILITIES } from '@/lib/houseCategories';
import { TRANSPORT_CATEGORIES } from '@/lib/transport';

export interface TransferSection {
  key: string;
  label: string;
  icon: string;
  table: string;
  needsTarget: boolean;
  targetLabel: string;
  categories: { key: string; label: string }[];
}

export const TRANSFER_SOURCES = [
  { key: 'transfer', label: 'Перевод на карту', icon: 'ArrowLeftRight' },
  { key: 'personal', label: 'С личной карты', icon: 'CreditCard' },
];

export const SOURCE_LABEL = (key: string) =>
  TRANSFER_SOURCES.find((s) => s.key === key)?.label || 'Перевод на карту';

export const TRANSFER_SECTIONS: TransferSection[] = [
  {
    key: 'transport',
    label: 'Транспорт',
    icon: 'Truck',
    table: 'transport_expenses',
    needsTarget: true,
    targetLabel: 'Единица техники',
    categories: TRANSPORT_CATEGORIES.map((c) => ({ key: c.key, label: c.label })),
  },
  {
    key: 'house',
    label: 'Дом',
    icon: 'Home',
    table: 'house_expenses',
    needsTarget: false,
    targetLabel: '',
    categories: FACILITIES.house.categories.map((c) => ({ key: c.key, label: c.label })),
  },
  {
    key: 'hotel',
    label: 'Гостиница',
    icon: 'BedDouble',
    table: 'house_expenses',
    needsTarget: false,
    targetLabel: '',
    categories: FACILITIES.hotel.categories.map((c) => ({ key: c.key, label: c.label })),
  },
  {
    key: 'banya',
    label: 'Баня',
    icon: 'Flame',
    table: 'house_expenses',
    needsTarget: false,
    targetLabel: '',
    categories: FACILITIES.banya.categories.map((c) => ({ key: c.key, label: c.label })),
  },
  {
    key: 'locations',
    label: 'Локации',
    icon: 'MapPin',
    table: 'expenses',
    needsTarget: true,
    targetLabel: 'Локация',
    categories: HOUSE_CATEGORIES.map((c) => ({ key: c.key, label: c.label })),
  },
];

export const SECTION = (key: string) => TRANSFER_SECTIONS.find((s) => s.key === key);

export const SECTION_LABEL = (key: string) => SECTION(key)?.label || 'Без раздела';

export const money = (v: unknown) =>
  `${Number(v || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`;
