import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CrudPage from '@/components/app/CrudPage';
import Icon from '@/components/ui/icon';
import { Row, listRows } from '@/lib/api';
import { money } from '@/lib/expenses';
import CollectiveSheetDialog from '@/components/app/CollectiveSheetDialog';
import HunterAccessDialog from '@/components/app/HunterAccessDialog';

const FEE = 6500;
const MONTHS_RU = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
];
const QUARTERS = [
  { key: 1, label: 'I квартал', months: [1, 2, 3] },
  { key: 2, label: 'II квартал', months: [4, 5, 6] },
  { key: 3, label: 'III квартал', months: [7, 8, 9] },
  { key: 4, label: 'IV квартал', months: [10, 11, 12] },
];

const Club = () => {
  const onlyMembers = useCallback((r: Row) => Boolean(r.club_member), []);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [fees, setFees] = useState<Row[]>([]);
  const [members, setMembers] = useState<Row[]>([]);

  useEffect(() => {
    listRows('club_fees').then(setFees).catch(() => setFees([]));
    listRows('guests')
      .then((g) => setMembers(g.filter((r) => r.club_member)))
      .catch(() => setMembers([]));
  }, []);

  return (
    <>
      <CollectiveSheetDialog open={sheetOpen} onOpenChange={setSheetOpen} />
      <HunterAccessDialog open={accessOpen} onOpenChange={setAccessOpen} guests={members} />
      <CrudPage
      table="guests"
      index="Раздел / Закрытый клуб охотников"
      title="Закрытый клуб охотников"
      lede="Члены клуба: контакты, срок членства, взносы и привилегии."
      addLabel="Добавить члена клуба"
      searchKeys={['name', 'phone', 'city', 'note']}
      headExtra={
        <>
          <button className="h-cta-ghost" onClick={() => setSheetOpen(true)}>
            <Icon name="ClipboardList" size={15} /> Коллективный лист
          </button>
          <button className="h-cta-ghost" onClick={() => setAccessOpen(true)}>
            <Icon name="KeyRound" size={15} /> Доступ в кабинет
          </button>
        </>
      }
      rowLink={(r) => `/club/${r.id}`}
      filter={onlyMembers}
      defaults={{ club_member: true }}
      columns={[
        { key: 'contract_no', label: 'Договор', width: '100px' },
        { key: 'name', label: 'Имя' },
        { key: 'cert_type', label: 'Статус', width: '110px' },
        { key: 'phone', label: 'Телефон', width: '150px' },
        {
          key: 'hunt_ticket',
          label: 'Охотбилет',
          width: '140px',
          render: (r) =>
            r.hunt_ticket ? (
              String(r.hunt_ticket)
            ) : (
              <span className="text-[#c0392b]">не внесён</span>
            ),
        },
        {
          key: 'born_on',
          label: 'Год рожд.',
          width: '100px',
          render: (r) => String(r.born_on || '').slice(0, 4) || '—',
        },
      ]}
      fields={[
        { key: 'name', label: 'ФИО полностью' },
        { key: 'born_on', label: 'Дата рождения', type: 'date' },
        { key: 'passport', label: 'Паспорт: серия и номер' },
        { key: 'passport_date', label: 'Паспорт: дата выдачи', type: 'date' },
  { key: 'passport_issued', label: 'Паспорт: кем выдан' },
        { key: 'address', label: 'Прописка' },
        { key: 'phone', label: 'Телефон' },
  { key: 'email', label: 'Электронная почта' },
  { key: 'inn', label: 'ИНН' },
  { key: 'snils', label: 'СНИЛС' },
        { key: 'city', label: 'Город' },
        { key: 'contract_no', label: 'Номер договора' },
        {
          key: 'cert_type',
          label: 'Удостоверение',
          type: 'select',
          options: [
            { value: 'охотник', label: 'Охотник' },
            { value: 'инспектор', label: 'Инспектор' },
          ],
        },
        { key: 'hunt_ticket', label: 'Охотничий билет: серия и номер' },
        { key: 'hunt_ticket_date', label: 'Охотбилет: дата выдачи', type: 'date' },
  { key: 'hunt_ticket_issued', label: 'Охотбилет: кем выдан' },
        { key: 'roh_number', label: 'РОХа: номер' },
        { key: 'roh_date', label: 'РОХа: действует до', type: 'date' },
        { key: 'roh_weapon', label: 'Оружие по РОХе' },
        { key: 'fee_monthly', label: 'Взнос в месяц, ₽', type: 'number' },
        { key: 'club_member', label: 'Член клуба', type: 'checkbox' },
        { key: 'club_until', label: 'Членство до', type: 'date' },
        { key: 'note', label: 'Заметка', type: 'textarea' },
      ]}
      extra={(rows: Row[]) => {
        const year = new Date().getFullYear();
        const planYear = rows.length * FEE * 12;
        const withTicket = rows.filter((r) => String(r.hunt_ticket || '').trim()).length;
        return (
          <>
            <div
              className="grid gap-px"
              style={{
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                background: '#e2e2df',
                border: '1px solid #e2e2df',
              }}
            >
              <div className="bg-white p-5">
                <div className="h-label">Членов клуба</div>
                <div className="h-head text-[26px] mt-2">{rows.length}</div>
              </div>
              <div className="bg-white p-5">
                <div className="h-label">Взнос в месяц</div>
                <div className="h-head text-[26px] mt-2">{money(FEE)}</div>
              </div>
              <div className="bg-white p-5">
                <div className="h-label">План взносов на {year}</div>
                <div className="h-head text-[26px] mt-2">{money(planYear)}</div>
              </div>
              <div className="bg-white p-5">
                <div className="h-label">Охотбилеты внесены</div>
                <div
                  className="h-head text-[26px] mt-2"
                  style={{ color: withTicket < rows.length ? '#c0392b' : undefined }}
                >
                  {withTicket} из {rows.length}
                </div>
              </div>
              <div className="bg-white p-5">
                <div className="h-label">Свободных мест</div>
                <div className="h-head text-[26px] mt-2">{Math.max(0, 24 - rows.length)}</div>
              </div>
            </div>
          </>
        );
      }}
      below={(rows: Row[]) => {
        const year = new Date().getFullYear();
        const planYear = rows.length * FEE * 12;
        return (
          <div className="mt-10">
            {(() => {
              const yFees = fees.filter((f) => Number(f.year) === year);
              const paidIn = (months: number[]) =>
                yFees
                  .filter((f) => f.paid && months.includes(Number(f.month)))
                  .reduce((s, f) => s + Number(f.amount || 0), 0);
              const planQ = rows.length * FEE * 3;

              const dueMonths = new Date().getMonth() + 1;

              const debtors = rows
                .map((m) => {
                  const own = yFees.filter(
                    (f) => Number(f.guest_id) === Number(m.id) && Number(f.month) <= dueMonths,
                  );
                  const paidMonths = own.filter((f) => f.paid).length;
                  const debtMonths = Math.max(0, dueMonths - paidMonths);
                  return { name: String(m.name), debtMonths, debt: debtMonths * FEE };
                })
                .filter((d) => d.debt > 0)
                .sort((a, b) => b.debt - a.debt);

              return (
                <>
                  <div className="h-label mb-3">Квартальный учёт взносов · {year}</div>
                  <div className="border border-[#e2e2df] overflow-x-auto bg-white">
                    <table className="w-full min-w-[620px]">
                      <thead>
                        <tr className="bg-[var(--hero-surface)]">
                          <th className="h-label text-left px-4 py-3 font-normal w-[150px]">
                            Квартал
                          </th>
                          <th className="h-label text-left px-4 py-3 font-normal w-[150px]">План</th>
                          <th className="h-label text-left px-4 py-3 font-normal w-[150px]">Факт</th>
                          <th className="h-label text-left px-4 py-3 font-normal">Отклонение</th>
                        </tr>
                      </thead>
                      <tbody>
                        {QUARTERS.map((q) => {
                          const fact = paidIn(q.months);
                          const diff = fact - planQ;
                          return (
                            <tr key={q.key} className="border-t border-[#e2e2df]">
                              <td className="px-4 py-3 text-[0.72em]">{q.label}</td>
                              <td className="px-4 py-3 text-[0.72em] whitespace-nowrap">
                                {money(planQ)}
                              </td>
                              <td className="px-4 py-3 text-[0.72em] font-bold whitespace-nowrap">
                                {money(fact)}
                              </td>
                              <td
                                className="px-4 py-3 text-[0.72em] whitespace-nowrap"
                                style={{ color: diff < 0 ? '#c0392b' : '#007a43' }}
                              >
                                {diff < 0 ? `−${money(Math.abs(diff))}` : money(diff)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-black bg-[var(--hero-surface)]">
                          <td className="px-4 py-3 text-[0.72em] font-bold">Итого за год</td>
                          <td className="px-4 py-3 text-[0.72em] font-bold whitespace-nowrap">
                            {money(planYear)}
                          </td>
                          <td className="px-4 py-3 text-[0.72em] font-bold whitespace-nowrap">
                            {money(paidIn([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]))}
                          </td>
                          <td className="px-4 py-3" />
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="mt-8 h-label mb-3">
                    Не сдали взносы на сегодня · {debtors.length} из {rows.length}
                  </div>
                  <div className="h-mono-cap normal-case mb-3 text-[var(--hero-muted)]">
                    Учтены месяцы с января по {MONTHS_RU[dueMonths - 1]} {year} включительно.
                  </div>
                  <div className="border border-[#e2e2df] overflow-x-auto bg-white">
                    <table className="w-full min-w-[520px]">
                      <thead>
                        <tr className="bg-[var(--hero-surface)]">
                          <th className="h-label text-left px-4 py-3 font-normal">ФИО</th>
                          <th className="h-label text-left px-4 py-3 font-normal w-[160px]">
                            Месяцев не сдано
                          </th>
                          <th className="h-label text-left px-4 py-3 font-normal w-[160px]">Долг</th>
                        </tr>
                      </thead>
                      <tbody>
                        {debtors.map((d) => (
                          <tr key={d.name} className="border-t border-[#e2e2df]">
                            <td className="px-4 py-3 text-[0.72em]">{d.name}</td>
                            <td className="px-4 py-3 text-[0.72em]">{d.debtMonths}</td>
                            <td
                              className="px-4 py-3 text-[0.72em] font-bold whitespace-nowrap"
                              style={{ color: '#c0392b' }}
                            >
                              {money(d.debt)}
                            </td>
                          </tr>
                        ))}
                        {!debtors.length && (
                          <tr>
                            <td className="px-4 py-6 text-[0.72em]" colSpan={3}>
                              Все взносы сданы
                            </td>
                          </tr>
                        )}
                      </tbody>
                      {debtors.length > 0 && (
                        <tfoot>
                          <tr className="border-t border-black bg-[var(--hero-surface)]">
                            <td className="px-4 py-3 text-[0.72em] font-bold" colSpan={2}>
                              Общая задолженность
                            </td>
                            <td
                              className="px-4 py-3 text-[0.75em] font-bold whitespace-nowrap"
                              style={{ color: '#c0392b' }}
                            >
                              {money(debtors.reduce((s, d) => s + d.debt, 0))}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </>
              );
            })()}

            <div className="mt-6">
              <Link className="h-cta-ghost inline-flex" to="/club/fees">
                <Icon name="Table" size={14} /> Журнал учёта взносов
              </Link>
            </div>
          </div>
        );
      }}
      />
    </>
  );
};

export default Club;