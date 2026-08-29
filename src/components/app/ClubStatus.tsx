import { useMemo } from 'react';
import Icon from '@/components/ui/icon';
import { Row } from '@/lib/api';
import { money } from '@/lib/expenses';
import { SPECIES_LABEL } from '@/lib/species';
import {
  CLUB_FEE,
  CLUB_DISCOUNT,
  FREE_QUOTA,
  feeState,
  bagState,
} from '@/lib/clubPrivileges';

const MONTHS = ['я', 'ф', 'м', 'а', 'м', 'и', 'и', 'а', 'с', 'о', 'н', 'д'];

interface Props {
  guestId: number;
  guest: Row | null;
  fees: Row[];
  bag: Row[];
  year: number;
  compact?: boolean;
}

const ClubStatus = ({ guestId, guest, fees, bag, year, compact = false }: Props) => {
  const fee = Number(guest?.fee_monthly || CLUB_FEE);
  const state = useMemo(() => feeState(fees, guestId, year, fee), [fees, guestId, year, fee]);
  const bagSt = useMemo(() => bagState(bag, year), [bag, year]);

  return (
    <>
      <div className="h-head text-[22px] mb-1">Членство в клубе · {year}</div>
      <p className="h-label mb-3 leading-relaxed">
        Взнос {money(fee)} в месяц. Проживание на базе бесплатное — для вас и вашей семьи.
      </p>

      <div
        className="grid gap-px mb-4"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          background: '#e2e2df',
          border: '1px solid #e2e2df',
        }}
      >
        <div className="bg-white p-5">
          <div className="h-label">Оплачено взносов</div>
          <div className="h-head text-[22px] mt-2">{money(state.paidSum)}</div>
          <div className="h-mono-cap mt-1 text-[var(--hero-muted)]">
            {state.paidMonths} из {state.dueMonths} месяцев
          </div>
        </div>
        <div className="bg-white p-5">
          <div className="h-label">Долг по взносам</div>
          <div
            className="h-head text-[22px] mt-2"
            style={{ color: state.debt ? '#c0392b' : '#007a43' }}
          >
            {state.debt ? money(state.debt) : 'нет'}
          </div>
          <div className="h-mono-cap mt-1 text-[var(--hero-muted)]">
            {state.debt ? `${state.debtMonths} мес. не оплачено` : 'всё закрыто'}
          </div>
        </div>
        <div className="bg-white p-5">
          <div className="h-label">Долг за добычу</div>
          <div
            className="h-head text-[22px] mt-2"
            style={{ color: bagSt.owed ? '#c0392b' : '#007a43' }}
          >
            {bagSt.owed ? money(bagSt.owed) : 'нет'}
          </div>
          <div className="h-mono-cap mt-1 text-[var(--hero-muted)]">
            {bagSt.lines.length} трофеев за сезон
          </div>
        </div>
        <div className="bg-white p-5">
          <div className="h-label">Сэкономлено на льготах</div>
          <div className="h-head text-[22px] mt-2">{money(bagSt.saved)}</div>
          <div className="h-mono-cap mt-1 text-[var(--hero-muted)]">
            бесплатно и по скидке
          </div>
        </div>
      </div>

      <div className="border border-[#e2e2df] bg-white p-4 mb-4">
        <div className="h-label mb-3">Взносы по месяцам</div>
        <div className="flex flex-wrap gap-1">
          {state.months.map((m) => {
            const overdue = !m.paid && m.month <= state.dueMonths;
            return (
              <span
                key={m.month}
                title={`${m.month} месяц`}
                className="w-8 h-8 flex items-center justify-center text-[0.68em] border"
                style={{
                  borderColor: '#e2e2df',
                  background: m.paid ? '#e8f6ee' : overdue ? '#fdeceb' : '#fff',
                  color: m.paid ? '#007a43' : overdue ? '#c0392b' : '#c9c9c4',
                }}
              >
                {MONTHS[m.month - 1]}
              </span>
            );
          })}
        </div>
      </div>

      {state.debt > 0 && (
        <div
          className="border px-4 py-3 mb-4 flex gap-3"
          style={{ borderColor: '#c0392b', background: '#fdeceb' }}
        >
          <Icon name="TriangleAlert" size={16} className="shrink-0 mt-[2px]" fallback="Info" />
          <p className="text-[0.78em] leading-relaxed">
            По взносам числится долг {money(state.debt)} за {state.debtMonths} мес.
            Льготы пока действуют, но задолженность нужно закрыть.
          </p>
        </div>
      )}

      <div className="h-head text-[22px] mb-1">Ваши привилегии</div>
      <p className="h-label mb-3 leading-relaxed">
        Бесплатные трофеи считаются от первой добычи в сезоне.
      </p>

      <div
        className="grid gap-px"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          background: '#e2e2df',
          border: '1px solid #e2e2df',
        }}
      >
        {Object.entries(FREE_QUOTA).map(([key, quota]) => (
          <div key={key} className="bg-white p-5">
            <span className="flex items-center gap-2">
              <Icon name="Gift" size={15} fallback="Circle" />
              <span className="h-label">{SPECIES_LABEL(key)} бесплатно</span>
            </span>
            <div className="h-head text-[22px] mt-2">
              {bagSt.leftFree[key] ?? quota} из {quota}
            </div>
            <div className="h-mono-cap mt-1 text-[var(--hero-muted)]">
              осталось в этом году
            </div>
          </div>
        ))}
        <div className="bg-white p-5">
          <span className="flex items-center gap-2">
            <Icon name="Percent" size={15} fallback="Circle" />
            <span className="h-label">Остальная дичь</span>
          </span>
          <div className="h-head text-[22px] mt-2">−{CLUB_DISCOUNT}%</div>
          <div className="h-mono-cap mt-1 text-[var(--hero-muted)]">от прайса хозяйства</div>
        </div>
        <div className="bg-white p-5">
          <span className="flex items-center gap-2">
            <Icon name="BedDouble" size={15} fallback="Circle" />
            <span className="h-label">Проживание</span>
          </span>
          <div className="h-head text-[22px] mt-2">бесплатно</div>
          <div className="h-mono-cap mt-1 text-[var(--hero-muted)]">
            вам и вашей семье
          </div>
        </div>
      </div>

      {!compact && bagSt.lines.length > 0 && (
        <>
          <div className="h-head text-[22px] mt-10 mb-3">Добыча и счёт за сезон</div>
          <div className="border border-[#e2e2df] overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead>
                <tr className="bg-[var(--hero-surface)]">
                  <th className="h-label text-left px-4 py-2 font-normal w-[110px]">Дата</th>
                  <th className="h-label text-left px-4 py-2 font-normal">Вид</th>
                  <th className="h-label text-left px-4 py-2 font-normal w-[130px]">По прайсу</th>
                  <th className="h-label text-left px-4 py-2 font-normal w-[150px]">Как считаем</th>
                  <th className="h-label text-left px-4 py-2 font-normal w-[130px]">К оплате</th>
                </tr>
              </thead>
              <tbody>
                {bagSt.lines.map((l) => (
                  <tr key={l.id} className="border-t border-[#e2e2df]">
                    <td className="px-4 py-2 text-[0.68em]">{l.taken_on || '—'}</td>
                    <td className="px-4 py-2 text-[0.72em]">{SPECIES_LABEL(l.species)}</td>
                    <td className="px-4 py-2 text-[0.7em] whitespace-nowrap">
                      {l.price ? money(l.price) : '—'}
                    </td>
                    <td className="px-4 py-2 text-[0.68em]">
                      {l.free ? (
                        <span style={{ color: '#007a43' }}>по членству</span>
                      ) : (
                        `скидка ${CLUB_DISCOUNT}%`
                      )}
                    </td>
                    <td className="px-4 py-2 text-[0.72em] whitespace-nowrap">
                      {l.charge ? money(l.charge) : '0 ₽'}
                      {l.paid && l.charge > 0 && (
                        <span className="h-label block" style={{ color: '#007a43' }}>
                          оплачено
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-black bg-[var(--hero-surface)]">
                  <td className="px-4 py-3 text-[0.72em] font-bold" colSpan={4}>
                    Итого к оплате за добычу
                  </td>
                  <td
                    className="px-4 py-3 text-[0.78em] font-bold whitespace-nowrap"
                    style={{ color: bagSt.owed ? '#c0392b' : '#007a43' }}
                  >
                    {money(bagSt.owed)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </>
  );
};

export default ClubStatus;
