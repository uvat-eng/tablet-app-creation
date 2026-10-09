import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import RecordDialog, { Field } from '@/components/app/RecordDialog';
import { Row, listRows, createRow, updateRow, removeRow } from '@/lib/api';
import { SPECIES, SPECIES_LABEL } from '@/lib/species';
import { money } from '@/lib/expenses';
import { CLUB_DISCOUNT, CLUB_FEE, feeState, bagState } from '@/lib/clubPrivileges';
import { toast } from 'sonner';
import useDataRefresh from '@/hooks/useDataRefresh';

const today = () => new Date().toISOString().slice(0, 10);

interface Props {
  guestId: number;
  guest: Row | null;
}

const ClubBagManager = ({ guestId, guest }: Props) => {
  const [bag, setBag] = useState<Row[]>([]);
  const [fees, setFees] = useState<Row[]>([]);
  const [services, setServices] = useState<Row[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const load = useCallback(async () => {
    const [b, f, s] = await Promise.all([
      listRows('club_bag'),
      listRows('club_fees'),
      listRows('services'),
    ]);
    setBag(b.filter((r) => Number(r.guest_id) === guestId));
    setFees(f);
    setServices(s.filter((r) => r.price_group === 'license'));
  }, [guestId]);

  useEffect(() => {
    load();
  }, [load]);


  useDataRefresh(load);

  const fee = Number(guest?.fee_monthly || CLUB_FEE);
  const feeSt = useMemo(() => feeState(fees, guestId, year, fee), [fees, guestId, year, fee]);
  const st = useMemo(() => bagState(bag, year), [bag, year]);

  const rowById = useCallback((id: number) => bag.find((r) => Number(r.id) === id), [bag]);

  const years = useMemo(() => {
    const set = new Set<number>([new Date().getFullYear()]);
    bag.forEach((b) => b.season && set.add(Number(b.season)));
    return [...set].sort((a, b) => b - a);
  }, [bag]);

  const fields: Field[] = useMemo(
    () => [
      {
        key: 'species',
        label: 'Вид',
        type: 'select',
        options: SPECIES.map((s) => ({ value: s.key, label: s.label })),
      },
      { key: 'taken_on', label: 'Дата добычи', type: 'date' },
      {
        key: 'service_id',
        label: 'Категория по прайсу — подставит цену',
        type: 'select',
        options: [
          { value: '', label: 'Вписать цену вручную' },
          ...services.map((s) => ({
            value: String(s.id),
            label: `${s.name} — ${money(s.price)}`,
          })),
        ],
      },
      { key: 'price', label: 'Стоимость по прайсу, ₽', type: 'number' },
      { key: 'paid_on', label: 'Оплачено — дата', type: 'date' },
      { key: 'note', label: 'Заметка', type: 'textarea' },
    ],
    [services],
  );

  const save = async (values: Row) => {
    const takenOn = String(values.taken_on || today()).slice(0, 10);
    const fromService = services.find((s) => String(s.id) === String(values.service_id));
    const price = Number(values.price || 0) || Number(fromService?.price || 0);
    const payload: Row = {
      guest_id: guestId,
      species: String(values.species || 'roe'),
      taken_on: takenOn,
      season: Number(takenOn.slice(0, 4)),
      price,
      paid_on: String(values.paid_on || '').slice(0, 10) || null,
      note: String(values.note || ''),
    };
    try {
      if (editing?.id) {
        await updateRow('club_bag', { ...payload, id: editing.id });
        toast.success('Запись обновлена');
      } else {
        await createRow('club_bag', payload);
        toast.success('Добыча записана');
      }
      setOpen(false);
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось сохранить');
    }
  };

  const drop = async (id: number) => {
    await removeRow('club_bag', id);
    toast.success('Запись убрана в архив');
    load();
  };

  const markPaid = async (id: number) => {
    await updateRow('club_bag', { id, paid_on: today() });
    toast.success('Отмечено как оплачено');
    load();
  };

  if (!guest?.club_member) return null;

  return (
    <>
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <span className="h-head text-[22px]">Добыча и счёт клуба</span>
        <span className="flex flex-wrap items-center gap-2">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className="h-label px-2 py-1 border"
              style={{
                borderColor: '#e2e2df',
                background: year === y ? 'var(--hero-accent)' : '#fff',
                color: year === y ? 'var(--hero-accent-contrast)' : 'inherit',
              }}
            >
              {y}
            </button>
          ))}
          <button
            className="h-cta-ghost"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Icon name="Plus" size={14} /> Добавить
          </button>
        </span>
      </div>

      <div
        className="grid gap-px mt-3"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          background: '#e2e2df',
          border: '1px solid #e2e2df',
        }}
      >
        <div className="bg-white p-4">
          <div className="h-label">Взносы оплачены</div>
          <div className="h-head text-[19px] mt-1">{money(feeSt.paidSum)}</div>
        </div>
        <div className="bg-white p-4">
          <div className="h-label">Долг по взносам</div>
          <div
            className="h-head text-[19px] mt-1"
            style={{ color: feeSt.debt ? '#c0392b' : '#007a43' }}
          >
            {feeSt.debt ? money(feeSt.debt) : 'нет'}
          </div>
        </div>
        <div className="bg-white p-4">
          <div className="h-label">Начислено за добычу</div>
          <div className="h-head text-[19px] mt-1">{money(st.charged)}</div>
        </div>
        <div className="bg-white p-4">
          <div className="h-label">Должен за добычу</div>
          <div
            className="h-head text-[19px] mt-1"
            style={{ color: st.owed ? '#c0392b' : '#007a43' }}
          >
            {st.owed ? money(st.owed) : 'нет'}
          </div>
        </div>
        <div className="bg-white p-4">
          <div className="h-label">Льгот осталось</div>
          <div className="h-head text-[19px] mt-1">
            косуля {st.leftFree.roe ?? 2} · кабан {st.leftFree.boar ?? 2}
          </div>
        </div>
      </div>

      <div className="mt-3 border border-[#e2e2df] overflow-x-auto bg-white">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="bg-[var(--hero-surface)]">
              <th className="h-label text-left px-4 py-2 font-normal w-[110px]">Дата</th>
              <th className="h-label text-left px-4 py-2 font-normal w-[130px]">Вид</th>
              <th className="h-label text-left px-4 py-2 font-normal w-[120px]">По прайсу</th>
              <th className="h-label text-left px-4 py-2 font-normal w-[140px]">Как считаем</th>
              <th className="h-label text-left px-4 py-2 font-normal w-[120px]">К оплате</th>
              <th className="h-label text-left px-4 py-2 font-normal">Заметка</th>
              <th className="h-label text-left px-4 py-2 font-normal w-[150px]" />
            </tr>
          </thead>
          <tbody>
            {st.lines.map((l) => (
              <tr
                key={l.id}
                className="border-t border-[#e2e2df] hover:bg-[var(--hero-surface)] cursor-pointer"
                onClick={() => {
                  setEditing(rowById(l.id) || null);
                  setOpen(true);
                }}
              >
                <td className="px-4 py-2 text-[0.68em]">{l.taken_on || '—'}</td>
                <td className="px-4 py-2 text-[0.72em]">{SPECIES_LABEL(l.species)}</td>
                <td className="px-4 py-2 text-[0.7em] whitespace-nowrap">
                  {l.price ? (
                    money(l.price)
                  ) : (
                    <span style={{ color: '#c0392b' }}>не задана</span>
                  )}
                </td>
                <td className="px-4 py-2 text-[0.68em]">
                  {l.free ? (
                    <span style={{ color: '#007a43' }}>по членству</span>
                  ) : (
                    `скидка ${CLUB_DISCOUNT}%`
                  )}
                </td>
                <td className="px-4 py-2 text-[0.72em] whitespace-nowrap">
                  {money(l.charge)}
                </td>
                <td className="px-4 py-2 text-[0.68em]">{l.note || '—'}</td>
                <td className="px-4 py-2">
                  <span className="flex flex-wrap gap-2">
                    {!l.paid && l.charge > 0 && (
                      <button
                        className="h-label underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          markPaid(l.id);
                        }}
                      >
                        Оплачено
                      </button>
                    )}
                    {l.paid && (
                      <span className="h-label" style={{ color: '#007a43' }}>
                        оплачено
                      </span>
                    )}
                    <button
                      className="h-label underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        drop(l.id);
                      }}
                    >
                      В архив
                    </button>
                  </span>
                </td>
              </tr>
            ))}
            {!st.lines.length && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-[0.72em] text-[var(--hero-muted)]">
                  Добычи в этом сезоне не было
                </td>
              </tr>
            )}
          </tbody>
          {st.lines.length > 0 && (
            <tfoot>
              <tr className="border-t border-black bg-[var(--hero-surface)]">
                <td className="px-4 py-3 text-[0.72em] font-bold" colSpan={4}>
                  Итого должен за добычу
                </td>
                <td
                  className="px-4 py-3 text-[0.78em] font-bold whitespace-nowrap"
                  colSpan={3}
                  style={{ color: st.owed ? '#c0392b' : '#007a43' }}
                >
                  {money(st.owed)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? 'Добыча члена клуба' : 'Новая добыча'}
        fields={fields}
        initial={editing || { taken_on: today(), species: 'roe' }}
        onSubmit={save}
      />
    </>
  );
};

export default ClubBagManager;
