import { StaffUser } from '@/lib/api';

export interface Section {
  key: string;
  to: string;
  label: string;
  icon: string;
}

export const SECTIONS: Section[] = [
  { key: 'dashboard', to: '/', label: 'Главная', icon: 'LayoutDashboard' },
  { key: 'bookings', to: '/bookings', label: 'Бронирования', icon: 'CalendarDays' },
  { key: 'checks', to: '/checks', label: 'Чеки', icon: 'ReceiptText' },
  { key: 'services', to: '/services', label: 'Услуги', icon: 'ClipboardList' },
  { key: 'transport', to: '/transport', label: 'Транспорт', icon: 'Truck' },
  { key: 'house', to: '/house', label: 'Дом', icon: 'Home' },
  { key: 'hotel', to: '/hotel', label: 'Гостиница', icon: 'BedDouble' },
  { key: 'banya', to: '/banya', label: 'Баня', icon: 'Flame' },
  { key: 'trophies', to: '/trophies', label: 'Трофейный зал', icon: 'Award' },
  { key: 'locations', to: '/locations', label: 'Локации', icon: 'Map' },
  { key: 'reviews', to: '/reviews', label: 'Отзывы', icon: 'MessageSquare' },
  { key: 'club', to: '/club', label: 'Клуб охотников', icon: 'Users' },
  { key: 'finance', to: '/finance', label: 'Финансы', icon: 'Wallet' },
  { key: 'archive', to: '/archive', label: 'Архив', icon: 'Archive' },
];

export const OWNER_ONLY: Section[] = [
  { key: 'staff', to: '/staff', label: 'Сотрудники', icon: 'UserCog' },
  { key: 'settings', to: '/settings', label: 'Настройки', icon: 'Settings' },
];

export const ROLES: Record<string, string> = {
  owner: 'Владелец',
  manager: 'Администратор',
  staff: 'Сотрудник',
};

export const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  manager: [
    'dashboard', 'bookings', 'checks', 'services', 'transport', 'house',
    'hotel', 'banya', 'trophies', 'locations', 'reviews', 'club',
  ],
  staff: ['dashboard', 'bookings', 'trophies', 'locations'],
};

export const parsePermissions = (raw: unknown): string[] =>
  String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const can = (user: StaffUser | null, key: string): boolean => {
  if (!user) return false;
  if (user.role === 'owner') return true;
  const list = parsePermissions(user.permissions);
  if (list.includes('all')) return true;
  if (!list.length) return (DEFAULT_PERMISSIONS[user.role] || []).includes(key);
  return list.includes(key);
};

export const allowedSections = (user: StaffUser | null): Section[] => {
  if (!user) return [];
  const base = SECTIONS.filter((s) => can(user, s.key));
  return user.role === 'owner' ? [...base, ...OWNER_ONLY] : base;
};