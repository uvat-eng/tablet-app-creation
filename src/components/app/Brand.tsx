import { useSettings } from '@/context/SettingsContext';

interface BrandProps {
  size?: 'sm' | 'md';
}

const Brand = ({ size = 'sm' }: BrandProps) => {
  const { settings } = useSettings();
  const name = settings.farm_name || 'Охотничье хозяйство';
  const logoH = size === 'md' ? 'h-[40px]' : 'h-[30px]';

  return (
    <div className="flex items-center gap-3">
      {settings.logo_url ? (
        <img src={settings.logo_url} alt={name} className={`${logoH} w-auto object-contain`} />
      ) : (
        <svg
          viewBox="0 0 108 26"
          className={size === 'md' ? 'w-[90px] h-[22px]' : 'w-[70px] h-[17px]'}
          aria-hidden
        >
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
      )}
      <span
        className={`${size === 'md' ? 'text-[0.7em]' : 'text-[0.64em]'} uppercase tracking-[0.14em] font-bold leading-tight`}
        style={{ fontFamily: 'var(--hero-font-head)' }}
      >
        {name}
      </span>
    </div>
  );
};

export default Brand;
