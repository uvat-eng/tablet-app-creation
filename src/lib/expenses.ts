export interface ExpenseCategory {
  key: string;
  label: string;
  icon: string;
}

export const HUNT_CATEGORIES: ExpenseCategory[] = [
  { key: 'food', label: 'Продукты', icon: 'ShoppingCart' },
  { key: 'fuel', label: 'Топливо', icon: 'Fuel' },
  { key: 'butchering', label: 'Разделка трофеев', icon: 'Axe' },
  { key: 'repair', label: 'Ремонты', icon: 'Hammer' },
  { key: 'other', label: 'Иное', icon: 'Package' },
];

export const EXPENSE_KINDS = [
  { key: 'hunt', label: 'Расходы на проведение охоты', icon: 'Target' },
  { key: 'transfer', label: 'Переводы на нужды', icon: 'ArrowLeftRight' },
  { key: 'fuel_card', label: 'Топливо по карте', icon: 'CreditCard' },
  { key: 'tech_repair', label: 'Ремонты техники', icon: 'Wrench' },
];

export const SPLIT_KINDS = [
  { key: 'to_account', label: 'Отправлено на расчётный счёт', icon: 'Landmark' },
  { key: 'to_farm', label: 'Оставлено на хозяйстве', icon: 'Home' },
];

export const HUNT_CATEGORY_LABEL = (key: string) =>
  HUNT_CATEGORIES.find((c) => c.key === key)?.label || 'Иное';

export const KIND_LABEL = (key: string) =>
  [...EXPENSE_KINDS, ...SPLIT_KINDS].find((k) => k.key === key)?.label || key;

export const money = (v: unknown) =>
  `${Number(v || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`;