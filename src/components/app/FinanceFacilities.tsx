import Icon from '@/components/ui/icon';
import { money } from '@/lib/expenses';
import { FACILITIES } from '@/lib/houseCategories';
import { LOCATION_KINDS } from '@/lib/locationKinds';

interface Props {
  facilityTotals: Record<string, number>;
  facilityTotal: number;
  locationTotals: Record<string, number>;
  locationTotal: number;
  navigate: (to: string) => void;
}

const FinanceFacilities = ({
  facilityTotals,
  facilityTotal,
  locationTotals,
  locationTotal,
  navigate,
}: Props) => (
  <>
    <div className="h-head text-[22px] mb-3">Содержание объектов</div>
    <div
      className="grid gap-px"
      style={{
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        background: '#e2e2df',
        border: '1px solid #e2e2df',
      }}
    >
      {Object.values(FACILITIES).map((f) => (
        <button
          key={f.key}
          onClick={() => navigate(f.base)}
          className="bg-white p-5 text-left hover:bg-[var(--hero-surface)] transition-colors"
        >
          <div className="h-label">{f.title}</div>
          <div className="h-head text-[20px] mt-2 whitespace-nowrap">
            {money(facilityTotals[f.key] || 0)}
          </div>
        </button>
      ))}
      <div className="bg-white p-5">
        <div className="h-label">Итого по объектам</div>
        <div className="h-head text-[20px] mt-2 whitespace-nowrap">{money(facilityTotal)}</div>
      </div>
    </div>

    <div className="h-head text-[22px] mt-10 mb-3">Биотехния и локации</div>
    <div
      className="grid gap-px"
      style={{
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        background: '#e2e2df',
        border: '1px solid #e2e2df',
      }}
    >
      {LOCATION_KINDS.map((k) => (
        <button
          key={k.key}
          onClick={() => navigate(`/locations/${k.key}`)}
          className="bg-white p-5 text-left hover:bg-[var(--hero-surface)] transition-colors"
        >
          <span className="flex items-center gap-2">
            <Icon name={k.icon} size={15} fallback="MapPin" />
            <span className="h-label">{k.label}</span>
          </span>
          <div className="h-head text-[19px] mt-2 whitespace-nowrap">
            {money(locationTotals[k.key] || 0)}
          </div>
        </button>
      ))}
      <div className="bg-white p-5">
        <div className="h-label">Итого по локациям</div>
        <div className="h-head text-[19px] mt-2 whitespace-nowrap">{money(locationTotal)}</div>
      </div>
    </div>
  </>
);

export default FinanceFacilities;
