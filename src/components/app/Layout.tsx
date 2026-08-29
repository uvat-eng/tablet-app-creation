import { ReactNode, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/context/AuthContext';
import { allowedSections, ROLES } from '@/lib/permissions';
import Brand from '@/components/app/Brand';
import SyncBadge from '@/components/app/SyncBadge';
import usePendingCounts from '@/hooks/usePendingCounts';

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
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  const counts = usePendingCounts(user);
  const badge = (key: string) => counts[key] || 0;
  const totalNew = Object.values(counts).reduce((a, b) => a + b, 0);

  useEffect(() => {
    setMenu(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menu ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menu]);

  const current = items.find((n) =>
    n.to === '/' ? location.pathname === '/' : location.pathname.startsWith(n.to),
  );

  return (
  <div className="h-shell min-h-screen flex">
    <aside className="w-[236px] shrink-0 border-r border-[#e2e2df] p-6 hidden lg:block sticky top-0 h-screen overflow-y-auto">
      <div className="mb-9">
        <Brand />
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
            <span className="flex-1">{n.label}</span>
            {badge(n.key) > 0 && (
              <span
                className="min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] rounded-full"
                style={{ background: '#c0392b', color: '#fff' }}
              >
                {badge(n.key)}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {user && (
        <div className="mt-8 pt-5 h-rule">
          <div className="h-label">{user.name}</div>
          <div className="h-label mt-1">{user.title || ROLES[user.role] || user.role}</div>
          <div className="mt-3">
            <SyncBadge />
          </div>
          {user.role !== 'hunter' && (
            <NavLink
              to="/account"
              className="h-label underline mt-2 flex items-center gap-1"
            >
              <Icon name="KeyRound" size={12} fallback="Lock" />
              Профиль и пароль
              {!user.password_changed && (
                <span
                  className="w-[6px] h-[6px] rounded-full inline-block"
                  style={{ background: '#c0392b' }}
                />
              )}
            </NavLink>
          )}
          <button className="h-label underline mt-2" onClick={signOut}>
            Выйти
          </button>
        </div>
      )}
    </aside>

    <main className="flex-1 min-w-0">
      <div
        className="lg:hidden border-b border-[#e2e2df] px-4 py-3 flex items-center justify-between gap-3 sticky top-0 z-30"
        style={{
          background: 'var(--hero-bg, #fff)',
          paddingTop: 'calc(0.75rem + env(safe-area-inset-top))',
        }}
      >
        <button
          onClick={() => setMenu(true)}
          className="flex items-center gap-2 border border-black px-3 py-2"
        >
          <Icon name="Menu" size={17} />
          <span className="text-[0.66em] uppercase tracking-[0.06em]">Меню</span>
          {totalNew > 0 ? (
            <span
              className="min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] rounded-full"
              style={{ background: '#c0392b', color: '#fff' }}
            >
              {totalNew}
            </span>
          ) : (
            user && !user.password_changed && (
              <span
                className="w-[6px] h-[6px] rounded-full inline-block"
                style={{ background: '#c0392b' }}
              />
            )
          )}
        </button>

        <span className="text-[0.62em] uppercase tracking-[0.06em] truncate text-[var(--hero-muted)]">
          {current?.label || ''}
        </span>

        <SyncBadge />
      </div>

      {menu && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <button
            aria-label="Закрыть меню"
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.45)' }}
            onClick={() => setMenu(false)}
          />

          <div
            className="relative w-[86%] max-w-[320px] h-full overflow-y-auto border-r border-[#e2e2df] flex flex-col"
            style={{
              background: '#fff',
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2e2df]">
              <Brand />
              <button onClick={() => setMenu(false)} className="p-2 -mr-2">
                <Icon name="X" size={20} />
              </button>
            </div>

            <nav className="flex flex-col gap-px p-3">
              {items.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 text-[0.72em] uppercase tracking-[0.06em] ${
                      isActive ? 'bg-black text-white' : 'hover:bg-[var(--hero-surface)]'
                    }`
                  }
                >
                  <Icon name={n.icon} size={17} fallback="Circle" />
                  <span className="flex-1">{n.label}</span>
                  {badge(n.key) > 0 && (
                    <span
                      className="min-w-[20px] h-[20px] px-1 flex items-center justify-center text-[11px] rounded-full"
                      style={{ background: '#c0392b', color: '#fff' }}
                    >
                      {badge(n.key)}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>

            {user && (
              <div className="mt-auto border-t border-[#e2e2df] p-5">
                <div className="h-label">{user.name}</div>
                <div className="h-label mt-1">
                  {user.title || ROLES[user.role] || user.role}
                </div>

                <NavLink
                  to={user.role === 'hunter' ? '/my/settings' : '/account'}
                  className="flex items-center gap-2 border border-[#e2e2df] px-3 py-3 mt-4 text-[0.72em]"
                >
                  <Icon name="KeyRound" size={15} fallback="Lock" />
                  Профиль и пароль
                  {!user.password_changed && (
                    <span
                      className="w-[6px] h-[6px] rounded-full inline-block"
                      style={{ background: '#c0392b' }}
                    />
                  )}
                </NavLink>

                <button
                  onClick={signOut}
                  className="flex items-center justify-center gap-2 w-full bg-[#1f1f1d] text-white px-3 py-3 mt-2 text-[0.72em]"
                >
                  <Icon name="LogOut" size={15} />
                  Выйти из учётной записи
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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