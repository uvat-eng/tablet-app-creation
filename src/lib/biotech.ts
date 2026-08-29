export interface BiotechKind {
  key: string;
  label: string;
  icon: string;
  unit: string;
  material: boolean;
}

export const BIOTECH_KINDS: BiotechKind[] = [
  { key: 'fuel', label: 'Топливо', icon: 'Fuel', unit: 'л', material: true },
  { key: 'grain', label: 'Зерно', icon: 'Wheat', unit: 'кг', material: true },
  { key: 'sowing', label: 'Участие в посевах', icon: 'Sprout', unit: 'га', material: false },
  { key: 'repair', label: 'Ремонты и стройки', icon: 'Hammer', unit: 'шт', material: false },
  { key: 'salt', label: 'Солонцы', icon: 'Gem', unit: 'шт', material: false },
  { key: 'feeder', label: 'Подкормочные площадки', icon: 'Home', unit: 'шт', material: false },
  { key: 'field', label: 'Кормовые поля', icon: 'Sprout', unit: 'га', material: false },
  { key: 'gravel', label: 'Галечники', icon: 'Mountain', unit: 'шт', material: false },
  { key: 'sign', label: 'Аншлаги и указатели', icon: 'Signpost', unit: 'шт', material: false },
  { key: 'biotech', label: 'Прочая биотехния', icon: 'Trees', unit: 'шт', material: false },
  { key: 'hunt_help', label: 'Проведение охот', icon: 'Target', unit: 'охот', material: false },
  { key: 'oil', label: 'Масло', icon: 'Droplet', unit: 'л', material: true },
  { key: 'supplies', label: 'Расходники', icon: 'Package', unit: 'шт', material: true },
  { key: 'work_base', label: 'Работа на базе', icon: 'Home', unit: 'ч', material: false },
  { key: 'work_field', label: 'Работа в поле', icon: 'Sprout', unit: 'ч', material: false },
  { key: 'work_forest', label: 'Работа в лесу', icon: 'Trees', unit: 'ч', material: false },
  { key: 'escort', label: 'Сопровождение охотников', icon: 'Users', unit: 'ч', material: false },
];

export const BIOTECH_LABEL = (key: string) =>
  BIOTECH_KINDS.find((k) => k.key === key)?.label || key;

export const BIOTECH_KIND = (key: string) =>
  BIOTECH_KINDS.find((k) => k.key === key) || BIOTECH_KINDS[BIOTECH_KINDS.length - 1];

export const BIOTECH_STATUS: Record<string, string> = {
  done: 'Выполнено',
  planned: 'Запланировано',
  counted: 'Зачтено в долг',
};

export const MATERIAL_PRICES: Record<string, number> = {
  fuel: 80,
  grain: 10,
};

export const materialValue = (kind: string, qty: unknown) => {
  const price = MATERIAL_PRICES[kind];
  if (!price) return 0;
  return Math.round(Number(qty || 0) * price);
};

export interface LicenseNorm {
  key: string;
  species: string;
  feeder: number;
  fieldHa: number;
  salt: number;
  gravel: number;
}

export const LICENSE_NORMS: LicenseNorm[] = [
  { key: 'elk', species: 'Лось', feeder: 3, fieldHa: 5, salt: 10, gravel: 20 },
  { key: 'roe', species: 'Косуля', feeder: 1, fieldHa: 3, salt: 3, gravel: 5 },
  { key: 'boar', species: 'Кабан', feeder: 3, fieldHa: 0, salt: 10, gravel: 20 },
  { key: 'bear', species: 'Медведь', feeder: 2, fieldHa: 5, salt: 8, gravel: 20 },
];

export interface BiotechDone {
  feeder: number;
  fieldHa: number;
  salt: number;
  gravel: number;
}

export const EMPTY_DONE: BiotechDone = { feeder: 0, fieldHa: 0, salt: 0, gravel: 0 };

export const addWork = (acc: BiotechDone, kind: string, qty: number): BiotechDone => {
  const n = Number(qty || 0);
  if (!n) return acc;
  if (kind === 'feeder') return { ...acc, feeder: acc.feeder + n };
  if (kind === 'field' || kind === 'sowing') return { ...acc, fieldHa: acc.fieldHa + n };
  if (kind === 'salt') return { ...acc, salt: acc.salt + n };
  if (kind === 'gravel') return { ...acc, gravel: acc.gravel + n };
  return acc;
};

export const earnedLicenses = (done: BiotechDone) =>
  LICENSE_NORMS.map((n) => {
    const feedPart =
      n.feeder && n.fieldHa
        ? Math.max(
            n.feeder ? done.feeder / n.feeder : 0,
            n.fieldHa ? done.fieldHa / n.fieldHa : 0,
          )
        : n.feeder
          ? done.feeder / n.feeder
          : n.fieldHa
            ? done.fieldHa / n.fieldHa
            : Infinity;
    const saltPart = n.salt ? done.salt / n.salt : Infinity;
    const gravelPart = n.gravel ? done.gravel / n.gravel : Infinity;
    const ratio = Math.min(feedPart, saltPart, gravelPart);
    return { ...n, ratio, count: Math.floor(ratio) };
  });

export const hoursText = (v: unknown) => {
  const n = Number(v || 0);
  const round = Math.round(n * 10) / 10;
  const last = Math.floor(round) % 10;
  const tens = Math.floor(round) % 100;
  let word = 'часов';
  if (last === 1 && tens !== 11) word = 'час';
  else if (last >= 2 && last <= 4 && (tens < 10 || tens >= 20)) word = 'часа';
  return `${round.toLocaleString('ru-RU')} ${word}`;
};