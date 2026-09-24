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
  { key: 'hunt-requests', to: '/hunt-requests', label: 'Заявки на охоту', icon: 'Inbox' },
  { key: 'supply-new', to: '/supply/new', label: 'Заказ', icon: 'ShoppingCart' },
  { key: 'supply', to: '/supply', label: 'Заявки на закупку', icon: 'Package' },
  { key: 'permits', to: '/permits', label: 'Путёвки', icon: 'Ticket' },
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
  { key: 'weapon-transfer', to: '/weapon-transfer', label: 'Передача оружия',
    icon: 'Crosshair' },
  { key: 'access', to: '/access', label: 'Логины и пароли', icon: 'KeyRound' },
  { key: 'closures', to: '/closures', label: 'Заявки на удаление', icon: 'UserX' },
  { key: 'archive', to: '/archive', label: 'Корзина и журнал', icon: 'Trash2' },
];

const CLUB_ONLY_KEYS = ['my-club', 'my-biotech', 'club-chat', 'locations'];

const CLUB_CHAT_LOGINS = ['spy', 'uan', 'una', 'zna', 'tgw'];

const PLAN_LOGINS = ['uan', 'una', 'zna'];

export const canPlanHunts = (user: StaffUser | null): boolean =>
  Boolean(user && PLAN_LOGINS.includes(String(user.login || '').toLowerCase()));

export const canModerate = (user: StaffUser | null): boolean =>
  Boolean(user && (user.can_manage_access || user.can_moderate));

export const canClubChat = (user: StaffUser | null): boolean => {
  if (!user) return false;
  if (CLUB_CHAT_LOGINS.includes(String(user.login || '').toLowerCase())) return true;
  return user.role === 'hunter' && isClubMember();
};

export const HUNTER_SECTIONS: Section[] = [
  { key: 'my', to: '/my', label: 'Мой кабинет', icon: 'UserRound' },
  { key: 'my-hunts', to: '/my/hunts', label: 'Мои охоты', icon: 'CalendarDays' },
  { key: 'my-price', to: '/my/price', label: 'Цены на охоту', icon: 'ReceiptText' },
  { key: 'map', to: '/map', label: 'Карта хозяйства', icon: 'Map' },
  { key: 'locations', to: '/locations', label: 'Локации', icon: 'MapPin' },
  { key: 'club-chat', to: '/club-chat', label: 'Чат клуба', icon: 'MessagesSquare' },
  { key: 'my-club', to: '/my/club', label: 'Членство и добыча', icon: 'ShieldCheck' },
  { key: 'my-biotech', to: '/my/biotech', label: 'Моя биотехния', icon: 'Trees' },
  { key: 'my-bag', to: '/my/bag', label: 'Моя добыча', icon: 'Target' },
  { key: 'my-review', to: '/my/review', label: 'Оставить отзыв', icon: 'MessageSquare' },
  { key: 'my-profile', to: '/my/profile', label: 'Мои данные', icon: 'IdCard' },
  { key: 'my-docs', to: '/my/docs', label: 'Мои документы', icon: 'FolderOpen' },
  { key: 'my-weapons', to: '/my/weapons', label: 'Моё оружие', icon: 'Crosshair' },
  { key: 'my-plans', to: '/my/plans', label: 'Планирование охот', icon: 'CalendarRange' },
  { key: 'my-settings', to: '/my/settings', label: 'Настройки', icon: 'Settings' },
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

export const hasGuestCard = (user: StaffUser | null) =>
  Boolean(user && user.role !== 'hunter' && Number(user.guest_id || 0) > 0);

export const canEditMap = (user: StaffUser | null) => {
  if (!user) return false;
  if (user.role !== 'hunter') return true;
  return isClubMember();
};

export const canSeeObjects = (user: StaffUser | null) => {
  if (!user) return false;
  if (user.role !== 'hunter') return true;
  return isClubMember();
};

export const canManageAccess = (user: StaffUser | null) =>
  Boolean(user && user.role !== 'hunter' && user.can_manage_access);

export const canApproveHunts = (user: StaffUser | null) =>
  Boolean(user && user.role !== 'hunter' && user.can_approve_hunts);

const CLUB_FLAG = 'hb_club_member';

export const setClubFlag = (v: boolean) => {
  try {
    localStorage.setItem(CLUB_FLAG, v ? '1' : '0');
  } catch {
    /* хранилище недоступно */
  }
};

export const isClubMember = () => {
  try {
    return localStorage.getItem(CLUB_FLAG) === '1';
  } catch {
    return false;
  }
};

export const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  manager: [
    'dashboard', 'bookings', 'hunt-requests', 'checks', 'files', 'services', 'transport', 'house',
    'hotel', 'banya', 'trophies', 'locations', 'map', 'reviews', 'club', 'hunters', 'biotech',
  ],
  staff: ['dashboard', 'bookings', 'hunt-requests', 'trophies', 'locations', 'map', 'files'],
};

export const parsePermissions = (raw: unknown): string[] =>
  String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const can = (user: StaffUser | null, key: string): boolean => {
  if (!user) return false;
  if (key === 'weapon-transfer') {
    return String(user.login || '').toLowerCase() === 'uan';
  }
  if (key === 'permits') {
    if (String(user.login || '').toLowerCase() === 'rustore') return false;
    return user.role !== 'hunter';
  }
  if (key === 'my-plans') return canPlanHunts(user);
  if (key === 'club-chat') return canClubChat(user);
  if (key === 'reports') return canModerate(user);
  if (key === 'closures') return canManageAccess(user);
  if (key === 'access') return Boolean(user.can_manage_access);
  if (key === 'supply') return Boolean(user.can_supply);
  if (key === 'supply-new') {
    return parsePermissions(user.permissions).includes('supply-new');
  }
  if (key.startsWith('my') && user.role !== 'hunter') return hasGuestCard(user);
  if (user.role === 'owner') return true;
  if (user.role === 'hunter') {
    if (CLUB_ONLY_KEYS.includes(key) && !isClubMember()) return false;
    return HUNTER_SECTIONS.some((s) => s.key === key);
  }
  const list = parsePermissions(user.permissions);
  if (list.includes('all')) return true;
  if (!list.length) return (DEFAULT_PERMISSIONS[user.role] || []).includes(key);
  return list.includes(key);
};

export const allowedSections = (user: StaffUser | null): Section[] => {
  if (!user) return [];
  if (user.role === 'hunter') {
    const plans = canPlanHunts(user);
    const base = HUNTER_SECTIONS.filter((s) => s.key !== 'my-plans' || plans);
    if (isClubMember()) return base;
    return base.filter((s) => !CLUB_ONLY_KEYS.includes(s.key));
  }
  const base = SECTIONS.filter((s) => can(user, s.key));
  const withChat = canClubChat(user)
    ? [
        ...base,
        {
          key: 'club-chat',
          to: '/club-chat',
          label: 'Чат клуба',
          icon: 'MessagesSquare',
        } as Section,
      ]
    : base;
  const withReports = canModerate(user)
    ? [
        ...withChat,
        {
          key: 'reports',
          to: '/reports',
          label: 'Жалобы на сообщения',
          icon: 'Flag',
        } as Section,
      ]
    : withChat;
  const mine = hasGuestCard(user)
    ? [
        ...withReports,
        ...HUNTER_SECTIONS.filter(
          (s) =>
            s.key.startsWith('my') &&
            s.key !== 'my-settings' &&
            (s.key !== 'my-plans' || canPlanHunts(user)) &&
            (!CLUB_ONLY_KEYS.includes(s.key) || isClubMember()),
        ),
      ]
    : withReports;
  return user.role === 'owner' ? [...mine, ...OWNER_ONLY] : mine;
};