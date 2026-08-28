import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import { Row, listRows, createRow, updateRow } from '@/lib/api';
import { money } from '@/lib/expenses';
import { toast } from 'sonner';

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const FEE = 6500;

interface Cell {
  id?: number;
  amount: number;
  paid: boolean;
}

const ClubFees = () => {
  const [members, setMembers] = useState<Row[]>([]);
  const [fees, setFees] = useState<Row[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [g, f] = await Promise.all([listRows('guests'), listRows('club_fees')]);
    setMembers(g.filter((x) => x.club_member));
    setFees(f);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const years = useMemo(() => {
    const set = new Set<number>([new Date().getFullYear()]);
    fees.forEach((f) => set.add(Number(f.year)));
    const now = new Date().getFullYear();
    set.add(now + 1);
    return [...set].sort((a, b) => b - a);
  }, [fees]);

  const grid = useMemo(() => {
    const map = new Map<string, Cell>();
    fees
      .filter((f) => Number(f.year) === year)
      .forEach((f) => {
        map.set(`${f.guest_id}_${f.month}`, {
          id: Number(f.id),
          amount: Number(f.amount || 0),
          paid: Boolean(f.paid),
        });
      });
    return map;
  }, [fees, year]);

  const rowStats = useCallback(
    (gid: number) => {
      let paid = 0;
      let debt = 0;
      for (let m = 1; m <= 12; m += 1) {
        const c = grid.get(`${gid}_${m}`);
        if (!c) continue;
        if (c.paid) paid += c.amount;
        else debt += c.amount;
      }
      return { paid, debt };
    },
    [grid],
  );

  const totals = useMemo(() => {
    let paid = 0;
    let debt = 0;
    members.forEach((m) => {
      const s = rowStats(Number(m.id));
      paid += s.paid;
      debt += s.debt;
    });
    const plan = members.length * FEE * 12;
    return { paid, debt, plan, members: members.length };
  }, [members, rowStats]);

  const toggle = async (gid: number, month: number) => {
    const key = `${gid}_${month}`;
    if (saving) return;
    setSaving(key);
    const cur = grid.get(key);
    try {
      if (!cur) {
        await createRow('club_fees', {
          guest_id: gid,
          year,
          month,
          amount: FEE,
          paid: true,
          paid_on: `${year}-${String(month).padStart(2, '0')}-01`,
          method: 'cash',
        });
      } else if (cur.paid) {
        await updateRow('club_fees', { id: Number(cur.id), paid: false, paid_on: null });
      } else {
        await updateRow('club_fees', {
          id: Number(cur.id),
          paid: true,
          paid_on: `${year}-${String(month).padStart(2, '0')}-01`,
        });
      }
      const f = await listRows('club_fees');
      setFees(f);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving('');
    }
  };

  const cellStyle = (c: Cell | undefined) => {
    if (!c) return { background: '#fff', color: '#c9c9c4' };
    if (c.paid) return { background: '#e8f6ee', color: '#007a43' };
    return { background: '#fdeceb', color: '#c0392b' };
  };

  return (
    <Layout
      index="Раздел / Закрытый клуб · Взносы"
      title="Учёт взносов"
      lede={`Членский взнос ${money(FEE)} в месяц. Нажмите на месяц, чтобы отметить оплату.`}
      action={
        <span className="flex flex-wrap gap-2">
          {years.map((y) => (
            <button
              key={y}
              className={year === y ? 'h-cta' : 'h-cta-ghost'}
              onClick={() => setYear(y)}
            >
              {y}
            </button>
          ))}
        </span>
      }
    >
      <div
        className="grid gap-px mb-6"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          background: '#e2e2df',
          border: '1px solid #e2e2df',
        }}
      >
        <div className="bg-white px-4 py-3">
          <div className="h-label">Членов клуба</div>
          <div className="h-head text-[22px] mt-1">{totals.members}</div>
        </div>
        <div className="bg-white px-4 py-3">
          <div className="h-label">Собрано за {year}</div>
          <div className="h-head text-[22px] mt-1">{money(totals.paid)}</div>
        </div>
        <div className="bg-white px-4 py-3">
          <div className="h-label">Задолженность</div>
          <div className="h-head text-[22px] mt-1" style={{ color: totals.debt ? '#c0392b' : undefined }}>
            {money(totals.debt)}
          </div>
        </div>
        <div className="bg-white px-4 py-3">
          <div className="h-label">План на год</div>
          <div className="h-head text-[22px] mt-1">{money(totals.plan)}</div>
        </div>
      </div>

      <div className="border border-[#e2e2df] overflow-x-auto">
        <table className="w-full min-w-[1040px]">
          <thead>
            <tr className="bg-[var(--hero-surface)]">
              <th className="h-label text-left px-3 py-3 font-normal sticky left-0 bg-[var(--hero-surface)] min-w-[220px]">
                Член клуба
              </th>
              {MONTHS.map((m) => (
                <th key={m} className="h-label px-1 py-3 font-normal text-center w-[58px]">
                  {m}
                </th>
              ))}
              <th className="h-label text-right px-3 py-3 font-normal w-[110px]">Оплачено</th>
              <th className="h-label text-right px-3 py-3 font-normal w-[100px]">Долг</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const gid = Number(m.id);
              const s = rowStats(gid);
              return (
                <tr key={gid} className="border-t border-[#e2e2df]">
                  <td className="px-3 py-2 text-[0.72em] sticky left-0 bg-white">
                    {String(m.name)}
                    {m.contract_no && (
                      <span className="h-label ml-2 opacity-60">дог. {String(m.contract_no)}</span>
                    )}
                  </td>
                  {MONTHS.map((_, i) => {
                    const month = i + 1;
                    const c = grid.get(`${gid}_${month}`);
                    const key = `${gid}_${month}`;
                    return (
                      <td key={month} className="p-[2px] text-center">
                        <button
                          onClick={() => toggle(gid, month)}
                          disabled={saving === key}
                          className="w-full h-[30px] text-[0.62em] border border-[#eeeeec]"
                          style={cellStyle(c)}
                          title={
                            c
                              ? `${c.paid ? 'Оплачено' : 'Не оплачено'} — ${money(c.amount)}`
                              : 'Нет записи, нажмите чтобы отметить оплату'
                          }
                        >
                          {saving === key ? '…' : c ? (c.paid ? '✓' : '✕') : '·'}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-[0.72em] text-right whitespace-nowrap">
                    {money(s.paid)}
                  </td>
                  <td
                    className="px-3 py-2 text-[0.72em] text-right whitespace-nowrap"
                    style={{ color: s.debt ? '#c0392b' : '#a3a39d' }}
                  >
                    {s.debt ? money(s.debt) : '—'}
                  </td>
                </tr>
              );
            })}
            {!members.length && (
              <tr>
                <td colSpan={15} className="px-4 py-10 text-center h-mono-cap text-[var(--hero-muted)]">
                  {loading ? 'Загружаем…' : 'В клубе пока нет членов'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-5 h-label">
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 inline-block" style={{ background: '#e8f6ee' }} /> оплачено
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 inline-block" style={{ background: '#fdeceb' }} /> долг
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 inline-block border border-[#e2e2df]" /> нет записи
        </span>
        <span className="flex items-center gap-2 ml-auto">
          <Icon name="Info" size={13} /> нажатие переключает оплату
        </span>
      </div>
    </Layout>
  );
};

export default ClubFees;
