export interface CostItem {
  key: string;
  label: string;
}

export interface LocationKind {
  key: string;
  label: string;
  single: string;
  icon: string;
  hint: string;
  unit: string;
  showArea?: boolean;
  costs: CostItem[];
  extra?: ('seed' | 'stock' | 'feed')[];
}

const BASE_COSTS: CostItem[] = [
  { key: 'materials', label: 'Материалы' },
  { key: 'work', label: 'Работы / ФОТ' },
  { key: 'fuel', label: 'Топливо и масло' },
  { key: 'parts', label: 'Запчасти' },
  { key: 'other', label: 'Иное' },
];

const CROP_COSTS: CostItem[] = [
  { key: 'fuel', label: 'Топливо и масло' },
  { key: 'work', label: 'ФОТ исполнителей' },
  { key: 'parts', label: 'Запчасти' },
  { key: 'seed', label: 'Зерно' },
  { key: 'poison', label: 'Отрава' },
  { key: 'chemistry', label: 'Химия' },
  { key: 'other', label: 'Иное' },
];

const ENCLOSURE_COSTS: CostItem[] = [
  { key: 'upgrade', label: 'Модернизация' },
  { key: 'feed', label: 'Корм' },
  { key: 'work', label: 'Работы / ФОТ' },
  { key: 'materials', label: 'Материалы' },
  { key: 'other', label: 'Иное' },
];

const SALT_COSTS: CostItem[] = [
  { key: 'salt', label: 'Соль' },
  { key: 'materials', label: 'Материалы' },
  { key: 'work', label: 'Работы / ФОТ' },
  { key: 'fuel', label: 'Топливо' },
  { key: 'other', label: 'Иное' },
];

export const LOCATION_KINDS: LocationKind[] = [
  {
    key: 'tower',
    label: 'Вышки',
    single: 'Вышка',
    icon: 'RadioTower',
    hint: 'Вышки и лабазы для охоты с подхода',
    unit: 'шт',
    costs: BASE_COSTS,
  },
  {
    key: 'feeder',
    label: 'Кормушки',
    single: 'Кормушка',
    icon: 'Wheat',
    hint: 'Подкормочные площадки и кормушки',
    unit: 'шт',
    costs: BASE_COSTS,
  },
  {
    key: 'salt',
    label: 'Солонцы',
    single: 'Солонец',
    icon: 'Grip',
    hint: 'Солонцы и минеральная подкормка',
    unit: 'кг соли',
    costs: SALT_COSTS,
  },
  {
    key: 'clearing',
    label: 'Уборка просек',
    single: 'Просека',
    icon: 'Scissors',
    hint: 'Расчистка просек и дорог',
    unit: 'км',
    costs: BASE_COSTS,
  },
  {
    key: 'crops',
    label: 'Посевы',
    single: 'Посев',
    icon: 'Sprout',
    hint: 'Кормовые поля и посевы',
    unit: 'га',
    showArea: true,
    costs: CROP_COSTS,
    extra: ['seed'],
  },
  {
    key: 'enclosure',
    label: 'Вольер',
    single: 'Вольер',
    icon: 'Fence',
    hint: 'Вольерное содержание животных',
    unit: 'га',
    showArea: true,
    costs: ENCLOSURE_COSTS,
    extra: ['stock', 'feed'],
  },
  {
    key: 'ground',
    label: 'Угодья',
    single: 'Угодье',
    icon: 'Map',
    hint: 'Закреплённые охотничьи угодья',
    unit: 'га',
    showArea: true,
    costs: BASE_COSTS,
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

export const CROP_STATUSES = [
  { value: 'sown', label: 'Посеяно' },
  { value: 'fallow', label: 'Под паром' },
];

export const STATUSES_FOR = (kindKey: string) =>
  kindKey === 'crops' ? CROP_STATUSES : STATUSES;

export const STATUS_LABEL = (key: string) =>
  [...STATUSES, ...CROP_STATUSES].find((s) => s.value === key)?.label || 'В порядке';

export const COST_LABEL = (kindKey: string, costKey: string) =>
  KIND(kindKey).costs.find((c) => c.key === costKey)?.label || 'Иное';

export const money = (v: unknown) =>
  `${Number(v || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`;