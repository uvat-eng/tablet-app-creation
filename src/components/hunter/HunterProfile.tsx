import Icon from '@/components/ui/icon';
import { Row } from '@/lib/api';
import { SPECIES } from '@/lib/species';
import { COUNTRIES } from '@/lib/countries';

interface Props {
  guest: Row;
  byS: Record<string, number>;
  total: number;
}

const HunterProfile = ({ guest, byS, total }: Props) => {
  const flag = COUNTRIES.find((c) => c.name === String(guest.country || 'Россия'))?.flag || '🏳️';

  const field = (label: string, value: unknown, wide = false) => (
    <div key={label} className={wide ? 'sm:col-span-2' : ''}>
      <div className="h-label">{label}</div>
      <div className="text-sm mt-1">{String(value || '—')}</div>
    </div>
  );

  return (
    <>
      <div
        className="grid gap-px mb-8"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          background: '#e2e2df',
          border: '1px solid #e2e2df',
        }}
      >
        {SPECIES.map((s) => (
          <div key={s.key} className="bg-white px-4 py-3">
            <div className="h-label flex items-center gap-2">
              <span className="text-[1.2em] leading-none">{s.emoji}</span>
              {s.label}
            </div>
            <div className="h-head text-[22px] mt-1">{byS[s.key] || 0}</div>
          </div>
        ))}
        <div className="bg-white px-4 py-3">
          <div className="h-label">Всего</div>
          <div className="h-head text-[22px] mt-1">{total}</div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 mb-10">
        <div className="border border-[#e2e2df] p-5">
          <div className="h-label mb-4 flex items-center gap-2">
            <Icon name="User" size={14} /> Личные данные
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {field('Страна', `${flag} ${guest.country || 'Россия'}`)}
            {field('Национальность', guest.nationality)}
            {field('Город проживания', guest.city)}
            {field('Дата рождения', String(guest.born_on || '').slice(0, 10))}
            {field('Телефон', guest.phone)}
            {field('Почта', guest.email)}
            {field('Прописка', guest.address, true)}
          </div>
        </div>

        <div className="border border-[#e2e2df] p-5">
          <div className="h-label mb-4 flex items-center gap-2">
            <Icon name="IdCard" size={14} fallback="CreditCard" /> Документы
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {field('Паспорт', guest.passport)}
            {field('Выдан', String(guest.passport_date || '').slice(0, 10))}
            {field('Кем выдан паспорт', guest.passport_issued, true)}
            {field('ИНН', guest.inn)}
            {field('СНИЛС', guest.snils)}
            {field('Охотничий билет', guest.hunt_ticket)}
            {field('Выдан', String(guest.hunt_ticket_date || '').slice(0, 10))}
            {field('Кем выдан охотбилет', guest.hunt_ticket_issued, true)}
            {field('РОХа', guest.roh_number)}
            {field('Действует до', String(guest.roh_date || '').slice(0, 10))}
            {field('Оружие', guest.roh_weapon, true)}
          </div>
        </div>
      </div>
    </>
  );
};

export default HunterProfile;
