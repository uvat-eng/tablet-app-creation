const NAV = [
  { id: 'booking', label: 'Бронирование' },
  { id: 'services', label: 'Услуги' },
  { id: 'stay', label: 'Проживание' },
  { id: 'club', label: 'Клуб' },
];

const Header = () => {
  const go = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <header className="h-pad flex flex-wrap items-center gap-y-4 pt-[26px] h-fade h-d1">
      <span className="flex items-center gap-3">
        <svg viewBox="0 0 108 26" className="w-[108px] h-[26px]" aria-label="Охотбаза">
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
          className="text-[0.72em] uppercase tracking-[0.14em] font-bold"
          style={{ fontFamily: 'var(--hero-font-head)' }}
        >
          Охотбаза
        </span>
      </span>

      <nav
        className="flex flex-wrap gap-x-11 gap-y-2 lg:ml-32 ml-8 text-[1.25em] font-medium tracking-[-0.01em]"
        style={{ fontFamily: 'var(--hero-font-head)' }}
      >
        {NAV.map((n) => (
          <button key={n.id} onClick={() => go(n.id)}>
            {n.label}
          </button>
        ))}
      </nav>

      <div
        className="flex gap-10 ml-auto text-[1.02em] font-medium tracking-[-0.01em]"
        style={{ fontFamily: 'var(--hero-font-head)' }}
      >
        <a href="#booking">Telegram</a>
        <a href="tel:+70000000000">Телефон</a>
      </div>
    </header>
  );
};

export default Header;
