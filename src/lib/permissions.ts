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
  { key: 'checks', to: '/documents', label: 'Акты и чеки', icon: 'ReceiptText' },
  { key: 'services', to: '/services', label: 'Услуги', icon: 'ClipboardList' },
  { key: 'transport', to: '/transport', label: 'Транспорт', icon: 'Truck' },
  { key: 'house', to: '/house', label: 'Дом', icon: 'Home' },
  { key: 'hotel', to: '/hotel', label: 'Гостиница', icon: 'BedDouble' },
  { key: 'banya', to: '/banya', label: 'Баня', icon: 'Flame' },
  { key: 'trophies', to: '/trophies', label: 'Трофейный зал', icon: 'Award' },
  { key: 'locations', to: '/locations', label: 'Локации', icon: 'MapPin' },
  { key: 'map', to: '/map', label: 'Карта хозяйства', icon: 'Map' },
  { key: 'reviews', to: '/reviews', label: 'Отзывы', icon: 'MessageSquare' },
  { key: 'club', to: '/club', label: 'Закрытый клуб охотников', icon: 'ShieldCheck' },
  { key: 'hunters', to: '/hunters', label: 'База охотников', icon: 'Users' },
  { key: 'files', to: '/files', label: 'Готовые документы', icon: 'FolderOpen' },
  { key: 'biotech', to: '/biotech', label: 'Охотники / биотехния', icon: 'Trees' },
  { key: 'finance', to: '/finance', label: 'Финансы', icon: 'Wallet' },
  { key: 'transfers', to: '/transfers', label: 'Финансы переводы', icon: 'ArrowLeftRight' },
  { key: 'office', to: '/office', label: 'Финансы ОФИС', icon: 'Landmark' },
  { key: 'archive', to: '/archive', label: 'Корзина и журнал', icon: 'Trash2' },
];

export const HUNTER_SECTIONS: Section[] = [
  { key: 'my', to: '/my', label: 'Мой кабинет', icon: 'UserRound' },
  { key: 'map', to: '/map', label: 'Карта хозяйства', icon: 'Map' },
  { key: 'locations', to: '/locations', label: 'Локации', icon: 'MapPin' },
  { key: 'my-biotech', to: '/my/biotech', label: 'Моя биотехния', icon: 'Trees' },
  { key: 'my-bag', to: '/my/bag', label: 'Моя добыча', icon: 'Target' },
  { key: 'my-profile', to: '/my/profile', label: 'Мои данные', icon: 'IdCard' },
  { key: 'my-docs', to: '/my/docs', label: 'Мои документы', icon: 'FolderOpen' },
];

export const OWNER_ONLY: Section[] = [
  { key: 'staff', to: '/staff', label: 'Сотрудники', icon: 'UserCog' },
  { key: 'settings', to: '/settings', label: 'Настройки', icon: 'Settings' },
];

export const ROLES: Record<string, string> = {
  owner: 'Владелец',
  manager: 'Администратор',
  staff: 'Сотрудник',
  hunter: 'Член клуба',
};

export const isHunter = (user: StaffUser | null) => user?.role === 'hunter';

export const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  manager: [
    'dashboard', 'bookings', 'checks', 'files', 'services', 'transport', 'house',
    'hotel', 'banya', 'trophies', 'locations', 'map', 'reviews', 'club', 'hunters', 'biotech',
  ],
  staff: ['dashboard', 'bookings', 'trophies', 'locations', 'map', 'files'],
};

export const parsePermissions = (raw: unknown): string[] =>
  String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const can = (user: StaffUser | null, key: string): boolean => {
  if (!user) return false;
  if (user.role === 'owner') return true;
  if (user.role === 'hunter') return HUNTER_SECTIONS.some((s) => s.key === key);
  const list = parsePermissions(user.permissions);
  if (list.includes('all')) return true;
  if (!list.length) return (DEFAULT_PERMISSIONS[user.role] || []).includes(key);
  return list.includes(key);
};

export const allowedSections = (user: StaffUser | null): Section[] => {
  if (!user) return [];
  if (user.role === 'hunter') return HUNTER_SECTIONS;
  const base = SECTIONS.filter((s) => can(user, s.key));
  return user.role === 'owner' ? [...base, ...OWNER_ONLY] : base;
};