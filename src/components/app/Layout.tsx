import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/context/AuthContext';
import { allowedSections, ROLES } from '@/lib/permissions';

interface LayoutProps {
  title: string;
  index: string;
  lede?: string;
  action?: ReactNode;
  children: ReactNode;
}

const Layout = ({ title, index, lede, action, children }: LayoutProps) => {
  const { user, signOut } = useAuth();
  const items = allowedSections(user);

  return (
  <div className="h-shell min-h-screen flex">
    <aside className="w-[236px] shrink-0 border-r border-[#e2e2df] p-6 hidden lg:block sticky top-0 h-screen overflow-y-auto">
      <div className="flex items-center gap-3 mb-9">
        <svg viewBox="0 0 108 26" className="w-[76px] h-[18px]" aria-label="Охотбаза">
          <g fill="currentColor">
            <rect x="0" y="0" width="9" height="26" />
            <rect x="12" y="6" width="9" height="14" />
            <rect x="24" y="0" width="9" height="26" />
            <rect x="36" y="10" width="9" height="6" />
            <rect x="48" y="0" width="9" height="26" />
            <rect x="60" y="6" width="9" height="20" />
            <rect x="72" y="0" width="9" height="14" />
            <rect x="84" y="4" width="9" height="18" />
            <rect x="96" y="0" width="9" height="26" />
          </g>
        </svg>
        <span
          className="text-[0.66em] uppercase tracking-[0.14em] font-bold"
          style={{ fontFamily: 'var(--hero-font-head)' }}
        >
          Охотбаза
        </span>
      </div>

      <nav className="flex flex-col gap-px">
        {items.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 text-[0.68em] uppercase tracking-[0.06em] ${
                isActive ? 'bg-black text-white' : 'hover:bg-[var(--hero-surface)]'
              }`
            }
          >
            <Icon name={n.icon} size={15} fallback="Circle" />
            {n.label}
          </NavLink>
        ))}
      </nav>

      {user && (
        <div className="mt-8 pt-5 h-rule">
          <div className="h-label">{user.name}</div>
          <div className="h-label mt-1">{ROLES[user.role] || user.role}</div>
          <button className="h-label underline mt-2" onClick={signOut}>
            Выйти
          </button>
        </div>
      )}
    </aside>

    <main className="flex-1 min-w-0">
      <div className="lg:hidden border-b border-[#e2e2df] px-4 py-3 flex gap-4 overflow-x-auto">
        {items.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              `text-[0.62em] uppercase tracking-[0.06em] whitespace-nowrap ${
                isActive ? 'font-bold' : 'text-[var(--hero-muted)]'
              }`
            }
          >
            {n.label}
          </NavLink>
        ))}
      </div>

      <div className="px-6 lg:px-12 py-10 max-w-[1280px]">
        <div className="flex flex-wrap items-end justify-between gap-4 h-fade h-d1">
          <div>
            <div className="h-label">{index}</div>
            <h1 className="h-head h-h2 mt-2">{title}</h1>
            {lede && <p className="h-mono-cap mt-3 max-w-[46ch]">{lede}</p>}
          </div>
          {action}
        </div>

        <div className="mt-9 h-fade h-d2">{children}</div>
      </div>
    </main>
  </div>
  );
};

export default Layout;