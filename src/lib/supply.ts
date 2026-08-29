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
