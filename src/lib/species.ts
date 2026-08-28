export interface Species {
  key: string;
  label: string;
  plural: string;
  icon: string;
  emoji: string;
}

export const SPECIES: Species[] = [
  { key: 'roe', label: 'Косуля', plural: 'Косуль', icon: 'Deer', emoji: '🦌' },
  { key: 'elk', label: 'Лось', plural: 'Лосей', icon: 'Deer', emoji: '🫎' },
  { key: 'boar', label: 'Кабан', plural: 'Кабанов', icon: 'PiggyBank', emoji: '🐗' },
  { key: 'lynx', label: 'Рысь', plural: 'Рысей', icon: 'Cat', emoji: '🐆' },
  { key: 'wolf', label: 'Волк', plural: 'Волков', icon: 'Dog', emoji: '🐺' },
  { key: 'bear', label: 'Медведь', plural: 'Медведей', icon: 'PawPrint', emoji: '🐻' },
  { key: 'grouse', label: 'Тетерев', plural: 'Тетеревов', icon: 'Bird', emoji: '🐦' },
];

export const SPECIES_LABEL = (key: string) =>
  SPECIES.find((s) => s.key === key)?.label || key;

export const SPECIES_ONE = (key: string) =>
  SPECIES.find((s) => s.key === key) || SPECIES[0];
