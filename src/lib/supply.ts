export const money = (v: unknown) => `${Number(v || 0).toLocaleString('ru-RU')} ₽`;

export const FACILITIES = [
  'Дом',
  'Гостиница',
  'Баня',
  'Кухня',
  'Транспорт',
  'Территория',
  'Общее',
];

export const CATEGORIES = [
  'Бытовая химия',
  'Продукты',
  'Хозтовары',
  'Постельное и текстиль',
  'Посуда',
  'Инструменты',
  'Прочее',
];

export const UNITS = ['шт', 'уп', 'кг', 'л', 'м', 'компл'];

export const URGENCY: Record<string, string> = {
  low: 'Не срочно',
  normal: 'Обычная',
  high: 'Срочно',
};

export const URGENCY_COLOR: Record<string, string> = {
  low: '#8a8a84',
  normal: '#1f1f1d',
  high: '#c0392b',
};

export const SUPPLY_STATUS: Record<string, string> = {
  new: 'Новая',
  approved: 'В работе',
  bought: 'Куплено',
  declined: 'Отклонена',
};

export const SUPPLY_COLOR: Record<string, string> = {
  new: '#b8860b',
  approved: '#1f6fb2',
  bought: '#007a43',
  declined: '#c0392b',
};

export interface TemplateLine {
  name: string;
  qty: number;
  unit: string;
  facility: string;
  est_price: number;
}

export interface SupplyTemplate {
  key: string;
  title: string;
  icon: string;
  category: string;
  hint: string;
  lines: TemplateLine[];
}

export const TEMPLATES: SupplyTemplate[] = [
  {
    key: 'chem',
    title: 'Химия на неделю',
    icon: 'SprayCan',
    category: 'Бытовая химия',
    hint: 'уборка дома, гостиницы и бани',
    lines: [
      { name: 'Fairy для посуды', qty: 3, unit: 'шт', facility: 'Кухня', est_price: 250 },
      { name: 'Туалетная бумага', qty: 4, unit: 'уп', facility: 'Общее', est_price: 400 },
      { name: 'Бумажные полотенца', qty: 2, unit: 'уп', facility: 'Кухня', est_price: 300 },
      { name: 'Средство для унитаза', qty: 2, unit: 'шт', facility: 'Гостиница', est_price: 250 },
      { name: 'Средство для пола', qty: 2, unit: 'шт', facility: 'Дом', est_price: 300 },
      { name: 'Стеклоочиститель', qty: 1, unit: 'шт', facility: 'Дом', est_price: 250 },
      { name: 'Мыло жидкое', qty: 3, unit: 'шт', facility: 'Общее', est_price: 200 },
      { name: 'Губки для посуды', qty: 2, unit: 'уп', facility: 'Кухня', est_price: 120 },
      { name: 'Мешки для мусора', qty: 3, unit: 'уп', facility: 'Общее', est_price: 200 },
      { name: 'Тряпки и салфетки', qty: 2, unit: 'уп', facility: 'Общее', est_price: 200 },
    ],
  },
  {
    key: 'food',
    title: 'Продукты на заезд',
    icon: 'ShoppingBasket',
    category: 'Продукты',
    hint: 'кухня на группу охотников',
    lines: [
      { name: 'Хлеб', qty: 10, unit: 'шт', facility: 'Кухня', est_price: 60 },
      { name: 'Картофель', qty: 10, unit: 'кг', facility: 'Кухня', est_price: 50 },
      { name: 'Овощи (лук, морковь)', qty: 5, unit: 'кг', facility: 'Кухня', est_price: 80 },
      { name: 'Мясо', qty: 8, unit: 'кг', facility: 'Кухня', est_price: 500 },
      { name: 'Крупы и макароны', qty: 5, unit: 'кг', facility: 'Кухня', est_price: 120 },
      { name: 'Масло растительное', qty: 3, unit: 'л', facility: 'Кухня', est_price: 150 },
      { name: 'Молоко и сметана', qty: 6, unit: 'л', facility: 'Кухня', est_price: 100 },
      { name: 'Яйца', qty: 3, unit: 'уп', facility: 'Кухня', est_price: 130 },
      { name: 'Чай, кофе, сахар', qty: 1, unit: 'компл', facility: 'Кухня', est_price: 1500 },
      { name: 'Вода питьевая', qty: 12, unit: 'л', facility: 'Кухня', est_price: 40 },
    ],
  },
  {
    key: 'linen',
    title: 'Бельё и текстиль',
    icon: 'BedDouble',
    category: 'Постельное и текстиль',
    hint: 'замена в гостинице и доме',
    lines: [
      { name: 'Комплект постельного белья', qty: 6, unit: 'компл', facility: 'Гостиница', est_price: 1800 },
      { name: 'Полотенца банные', qty: 10, unit: 'шт', facility: 'Гостиница', est_price: 600 },
      { name: 'Полотенца для рук', qty: 10, unit: 'шт', facility: 'Общее', est_price: 250 },
      { name: 'Простыни в баню', qty: 6, unit: 'шт', facility: 'Баня', est_price: 500 },
      { name: 'Подушки', qty: 4, unit: 'шт', facility: 'Гостиница', est_price: 900 },
      { name: 'Одеяла', qty: 4, unit: 'шт', facility: 'Гостиница', est_price: 1500 },
    ],
  },
  {
    key: 'banya',
    title: 'Баня к заезду',
    icon: 'Flame',
    category: 'Хозтовары',
    hint: 'веники, дрова, мелочи',
    lines: [
      { name: 'Веники берёзовые', qty: 10, unit: 'шт', facility: 'Баня', est_price: 250 },
      { name: 'Дрова колотые', qty: 2, unit: 'компл', facility: 'Баня', est_price: 2500 },
      { name: 'Мыло и шампунь', qty: 4, unit: 'шт', facility: 'Баня', est_price: 250 },
      { name: 'Шапки банные', qty: 6, unit: 'шт', facility: 'Баня', est_price: 350 },
      { name: 'Соль и травы для парной', qty: 2, unit: 'уп', facility: 'Баня', est_price: 400 },
    ],
  },
];