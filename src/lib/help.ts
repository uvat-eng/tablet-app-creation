export interface HelpKind {
  key: string;
  label: string;
  icon: string;
  unit: string;
  material: boolean;
}

export const HELP_KINDS: HelpKind[] = [
  { key: 'fuel', label: 'Топливо', icon: 'Fuel', unit: 'л', material: true },
  { key: 'oil', label: 'Масло', icon: 'Droplet', unit: 'л', material: true },
  { key: 'supplies', label: 'Расходники', icon: 'Package', unit: 'шт', material: true },
  { key: 'work_base', label: 'Работа на базе', icon: 'Home', unit: 'ч', material: false },
  { key: 'work_field', label: 'Работа в поле', icon: 'Sprout', unit: 'ч', material: false },
  { key: 'work_forest', label: 'Работа в лесу', icon: 'Trees', unit: 'ч', material: false },
  { key: 'escort', label: 'Сопровождение охотников', icon: 'Users', unit: 'ч', material: false },
];

export const HELP_LABEL = (key: string) =>
  HELP_KINDS.find((k) => k.key === key)?.label || key;

export const HELP_KIND = (key: string) => HELP_KINDS.find((k) => k.key === key);
