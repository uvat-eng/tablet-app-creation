export interface LocationKind {
  key: string;
  label: string;
  single: string;
  icon: string;
  hint: string;
  unit: string;
  showArea?: boolean;
}

export const LOCATION_KINDS: LocationKind[] = [
  {
    key: 'tower',
    label: 'Вышки',
    single: 'Вышка',
    icon: 'RadioTower',
    hint: 'Вышки и лабазы для охоты с подхода',
    unit: 'шт',
  },
  {
    key: 'feeder',
    label: 'Кормушки',
    single: 'Кормушка',
    icon: 'Wheat',
    hint: 'Подкормочные площадки и кормушки',
    unit: 'шт',
  },
  {
    key: 'salt',
    label: 'Солонцы',
    single: 'Солонец',
    icon: 'Grip',
    hint: 'Солонцы и минеральная подкормка',
    unit: 'кг соли',
  },
  {
    key: 'clearing',
    label: 'Уборка просек',
    single: 'Просека',
    icon: 'Scissors',
    hint: 'Расчистка просек и дорог',
    unit: 'км',
  },
  {
    key: 'crops',
    label: 'Посевы',
    single: 'Посев',
    icon: 'Sprout',
    hint: 'Кормовые поля и посевы',
    unit: 'га',
    showArea: true,
  },
  {
    key: 'enclosure',
    label: 'Вольер',
    single: 'Вольер',
    icon: 'Fence',
    hint: 'Вольерное содержание животных',
    unit: 'га',
    showArea: true,
  },
  {
    key: 'ground',
    label: 'Угодья',
    single: 'Угодье',
    icon: 'Map',
    hint: 'Закреплённые охотничьи угодья',
    unit: 'га',
    showArea: true,
  },
];

export const KIND = (key: string) =>
  LOCATION_KINDS.find((k) => k.key === key) || LOCATION_KINDS[LOCATION_KINDS.length - 1];

export const STATUSES = [
  { value: 'ok', label: 'В порядке' },
  { value: 'repair', label: 'Требует ремонта' },
  { value: 'planned', label: 'Запланировано' },
  { value: 'off', label: 'Не используется' },
];

export const STATUS_LABEL = (key: string) =>
  STATUSES.find((s) => s.value === key)?.label || 'В порядке';