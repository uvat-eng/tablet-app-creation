import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Layout from '@/components/app/Layout';
import { Row, listRows, createRow, updateRow, removeRow } from '@/lib/api';
import { PriceItem, loadPriceItems, lineSum, money, GROUP_LABELS } from '@/lib/price';
import { rublesInWords } from '@/lib/rubles';
import ActServiceDialog from '@/components/app/ActServiceDialog';
import PdfButtons from '@/components/app/PdfButtons';
import PayQr from '@/components/app/PayQr';
import { toast } from 'sonner';
import useDataRefresh from '@/hooks/useDataRefresh';

const dmy = (v: unknown) => {
  const s = String(v || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const [y, m, d] = s.split('-');
  return `${d}.${m}.${y}`;
};

const ActCard = () => {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const [head, setHead] = useState<Row>({
    guest_name: '',
    guest_phone: '',
    hunt_type: '',
    people: 1,
    transport: 'Хозяйство',
    date_from: '',
    date_to: '',
    plan_bag: '',
    hunted_by: '',
    calculated_by: '',
    accepted_by: '',
  });
  const [items, setItems] = useState<PriceItem[]>([]);
  const [price, setPrice] = useState<PriceItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pickOpen, setPickOpen] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const load = useCallback(async () => {
    const list0 = await loadPriceItems();
    setPrice(list0);
    if (isNew) {
      setItems([]);
      setLoading(false);
      return;
    }
    const list = await listRows('checks');
    const found = list.find((r) => String(r.id) === id);
    if (found) {
      setHead(found);
      const raw = found.items;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const saved: PriceItem[] = Array.isArray(parsed) ? (parsed as PriceItem[]) : [];
      setItems(saved.filter((s) => s.hunters || s.days || s.tariff));
      setDiscount(Number(found.discount_pct || 0));
    }
    setLoading(false);
  }, [id, isNew]);

  useEffect(() => {
    load();
  }, [load]);


  useDataRefresh(load);

  const totals = useMemo(() => {
    const sums = items.map(lineSum);
    const total = sums.reduce((s, v) => s + v, 0);
    const by = (g: PriceItem['group']) =>
      items.reduce((s, i, idx) => (i.group === g ? s + sums[idx] : s), 0);
    const cut = Math.round((total * discount) / 100);
    return {
      total,
      stay: by('stay'),
      license: by('license'),
      extra: by('extra'),
      cut,
      final: total - cut,
      sums,
    };
  }, [items, discount]);

  const days = useMemo(() => {
    const a = String(head.date_from || '');
    const b = String(head.date_to || '');
    if (!a || !b) return 1;
    const diff = Math.round(
      (new Date(b).getTime() - new Date(a).getTime()) / 86400000,
    );
    return diff > 0 ? diff : 1;
  }, [head.date_from, head.date_to]);

  const applyItem = (it: PriceItem) => {
    setItems((prev) =>
      editIdx === null ? [...prev, it] : prev.map((x, i) => (i === editIdx ? it : x)),
    );
    setEditIdx(null);
  };

  const dropItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const save = async () => {
    const used = items;
    const body: Row = {
      guest_name: String(head.guest_name || ''),
      guest_phone: String(head.guest_phone || ''),
      hunt_type: String(head.hunt_type || ''),
      people: Number(head.people || 1),
      transport: String(head.transport || ''),
      date_from: String(head.date_from || '') || null,
      date_to: String(head.date_to || '') || null,
      plan_bag: String(head.plan_bag || ''),
      items: used as never,
      discount_pct: discount,
      total: totals.total,
      stay_total: totals.stay,
      licenses_total: totals.license,
      extras_total: totals.extra,
      final_total: totals.final,
      hunted_by: String(head.hunted_by || ''),
      calculated_by: String(head.calculated_by || ''),
      accepted_by: String(head.accepted_by || ''),
      booking_id: head.booking_id ? Number(head.booking_id) : null,
    };
    if (isNew) {
      const created = await createRow('checks', body);
      toast.success('Акт сохранён');
      navigate(`/documents/act/${created.id}`, { replace: true });
      return;
    }
    await updateRow('checks', { ...body, id: Number(id) });
    toast.success('Акт сохранён');
  };

  const drop = async () => {
    if (!confirm('Удалить акт? Связанный чек останется.')) return;
    try {
      await removeRow('checks', Number(id));
      toast.success('Акт удалён');
      navigate('/documents');
    } catch {
      toast.error('Не удалось удалить');
    }
  };

  const openReceipt = async () => {
    const list = await listRows('receipts');
    const exist = list.find((r) => Number(r.check_id) === Number(id));
    if (exist) {
      navigate(`/documents/receipt/${exist.id}`);
      return;
    }
    const created = await createRow('receipts', {
      check_id: Number(id),
      booking_id: head.booking_id ? Number(head.booking_id) : null,
      number: String(id),
      issued_on: new Date().toISOString().slice(0, 10),
      org_name: 'Охотничье хозяйство «Малышенское»',
      accepted_from: String(head.guest_name || ''),
      basis: `Оплата услуг по акту № ${id} от ${String(head.date_from || '')}`,
      amount: totals.final,
      amount_words: rublesInWords(totals.final),
      attachment: `Акт № ${id}`,
      credit_account: '90',
      debit_account: '50',
      chief_accountant: String(head.calculated_by || ''),
      cashier: String(head.accepted_by || ''),
    });
    toast.success('Чек создан');
    navigate(`/documents/receipt/${created.id}`);
  };

  if (loading) {
    return (
      <Layout index="Раздел / Документы" title="Акт">
        <div className="h-mono-cap">Загружаем…</div>
      </Layout>
    );
  }

  const field = (label: string, key: string, type = 'text') => (
    <label className="block">
      <span className="h-label">{label}</span>
      <input
        type={type}
        className="mt-1 w-full border border-[#e2e2df] px-3 py-2 text-[0.72em] bg-white"
        value={String(head[key] ?? '')}
        onChange={(e) => setHead((p) => ({ ...p, [key]: e.target.value }))}
      />
    </label>
  );

  return (
    <Layout
      index="Раздел / Документы"
      title={isNew ? 'Новый акт' : `Акт № ${id}`}
      lede={`${head.guest_name || 'Без имени'} — ${head.hunt_type || 'вид охоты не указан'}`}
      action={
        <span className="flex gap-2 no-print">
          <Link className="h-cta-ghost" to="/documents">
            К списку
          </Link>
          {!isNew && (
            <>
              <Link className="h-cta-ghost" to={`/documents/expenses/${id}`}>
                Акт о расходах
              </Link>
              <button className="h-cta-ghost" onClick={openReceipt}>
                Чек (ПКО)
              </button>
            </>
          )}
          {!isNew && <PdfButtons kind="act" id={String(id)} />}
          {!isNew && (
            <button className="h-cta-ghost" onClick={drop}>
              Удалить
            </button>
          )}
          <button className="h-cta" onClick={save}>
            Сохранить
          </button>
        </span>
      }
    >
      <div className="no-print grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {field('Гость ФИО', 'guest_name')}
        {field('Телефон', 'guest_phone')}
        {field('Вид охоты', 'hunt_type')}
        {field('Кол-во участников', 'people', 'number')}
        {field('Транспорт', 'transport')}
        {field('Заезд', 'date_from', 'date')}
        {field('Выезд', 'date_to', 'date')}
        {field('План добычи', 'plan_bag')}
        {field('Охоту провёл', 'hunted_by')}
        {field('Расчёт произвёл', 'calculated_by')}
        {field('Оплату принял', 'accepted_by')}
      </div>

      <div className="no-print mb-8 border border-[#e2e2df] bg-white px-5 py-4 flex flex-wrap items-center gap-4">
        <span className="h-label">Скидка на весь акт</span>
        <input
          type="number"
          className="w-[110px] border border-[#e2e2df] px-3 py-2 text-[0.75em] bg-white"
          value={discount}
          onChange={(e) => setDiscount(Number(e.target.value || 0))}
        />
        <span className="h-label">%</span>
        {discount > 0 && (
          <span className="text-[0.78em]">
            минус {money(totals.cut)} · к оплате {money(totals.final)}
          </span>
        )}
      </div>

      <div id="check-print" className="border border-[#e2e2df] bg-white p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex-1 text-center">
            <div className="h-head text-[22px]">
              Акт выполненных работ {isNew ? '' : `№ ${id}`}
            </div>
            <div className="h-label mt-1">Охотничье хозяйство «Малышенское»</div>
          </div>
          {!isNew && totals.final > 0 && (
            <PayQr
              amount={totals.final}
              purpose={`Оплата услуг по акту № ${id} от ${dmy(head.date_from)}`}
              payer={String(head.guest_name || '')}
              docNo={String(id)}
              docDate={dmy(head.date_from)}
              size={104}
            />
          )}
        </div>
        <div className="flex flex-wrap justify-between gap-6">
          <div>
            <div className="h-head text-[20px]">
              {String(head.guest_name || '—')} {String(head.guest_phone || '')}
            </div>
            <div className="mt-4 grid gap-2 text-[0.72em]">
              <div>
                <span className="h-label">Вид охоты</span> {String(head.hunt_type || '—')}
              </div>
              <div>
                <span className="h-label">Кол-во участников</span> {String(head.people || 0)} чел
              </div>
              <div>
                <span className="h-label">Транспорт</span> {String(head.transport || '—')}
              </div>
              <div>
                <span className="h-label">Срок охоты</span> {dmy(head.date_from)} —{' '}
                {dmy(head.date_to)}
              </div>
              <div>
                <span className="h-label">План добычи</span> {String(head.plan_bag || '—')}
              </div>
            </div>
          </div>

          <div className="grid gap-3 min-w-[240px]">
            {[
              { l: 'Общая стоимость охоты', v: totals.final },
              { l: 'Стоимость лицензий', v: totals.license },
              { l: 'Стоимость размещения', v: totals.stay },
              { l: 'Стоимость доп. услуг', v: totals.extra },
              { l: `Скидка ${discount}%`, v: totals.cut },
            ].map((b) => (
              <div key={b.l} className="border border-[#e2e2df] p-3">
                <div className="h-label">{b.l}</div>
                <div className="h-head text-[17px] mt-1 whitespace-nowrap">{money(b.v)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="no-print mt-8 flex flex-wrap items-center gap-3">
          <button
            className="h-cta"
            onClick={() => {
              setEditIdx(null);
              setPickOpen(true);
            }}
          >
            Добавить услугу
          </button>
          <span className="h-label">Позиций в акте: {items.length}</span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-[var(--hero-surface)]">
                {['Услуга', 'Кол-во', 'Дней', 'Тариф', 'Скидка', 'Сумма', ''].map((h, i) => (
                  <th
                    key={h + i}
                    className={`h-label text-left px-2 py-2 font-normal${i === 6 ? ' no-print' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={`${it.name}-${idx}`} className="border-t border-[#e2e2df]">
                  <td className="px-2 py-2 text-[0.72em]">
                    <div>{it.name}</div>
                    <div className="h-label mt-[2px]">{it.category || GROUP_LABELS[it.group]}</div>
                  </td>
                  <td className="px-2 py-2 text-[0.72em]">{it.hunters || '—'}</td>
                  <td className="px-2 py-2 text-[0.72em]">
                    {it.mode === 'perDayPerHunter' ? it.days || '—' : '—'}
                  </td>
                  <td className="px-2 py-2 text-[0.72em] whitespace-nowrap">{money(it.tariff)}</td>
                  <td className="px-2 py-2 text-[0.72em]">
                    {it.discount ? `${it.discount}%` : '—'}
                  </td>
                  <td className="px-2 py-2 text-[0.72em] font-bold whitespace-nowrap">
                    {money(totals.sums[idx])}
                  </td>
                  <td className="px-2 py-2 no-print">
                    <span className="flex gap-3">
                      <button
                        className="h-label underline"
                        onClick={() => {
                          setEditIdx(idx);
                          setPickOpen(true);
                        }}
                      >
                        Править
                      </button>
                      <button
                        className="h-label underline"
                        style={{ color: '#c0392b' }}
                        onClick={() => dropItem(idx)}
                      >
                        Убрать
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td className="px-2 py-6 text-[0.72em] text-[var(--hero-muted)]" colSpan={7}>
                    Услуги не добавлены. Нажмите «Добавить услугу».
                  </td>
                </tr>
              )}
              <tr className="border-t-2 border-black">
                <td className="px-2 py-2 h-label" colSpan={5}>
                  Итого
                </td>
                <td className="px-2 py-2 text-[0.75em] font-bold whitespace-nowrap" colSpan={2}>
                  {money(totals.total)}
                </td>
              </tr>
              {discount > 0 && (
                <tr>
                  <td className="px-2 py-1 h-label" colSpan={5}>
                    Скидка {discount}%
                  </td>
                  <td className="px-2 py-1 text-[0.75em] whitespace-nowrap" colSpan={2}>
                    −{money(totals.cut)}
                  </td>
                </tr>
              )}
              <tr>
                <td className="px-2 py-2 h-label" colSpan={5}>
                  Итог к оплате
                </td>
                <td className="px-2 py-2 h-head text-[18px] whitespace-nowrap" colSpan={2}>
                  {money(totals.final)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-10 grid gap-4 text-[0.72em]">
          {[
            { l: 'Охоту провёл:', v: head.hunted_by },
            { l: 'Расчёт произвёл:', v: head.calculated_by },
            { l: 'Оплату принял:', v: head.accepted_by },
          ].map((s) => (
            <div key={s.l} className="flex gap-6 items-end">
              <span className="w-[150px]">{s.l}</span>
              <span className="flex-1 border-b border-black max-w-[220px]" />
              <span>{String(s.v || '')}</span>
            </div>
          ))}
        </div>
      </div>
      <ActServiceDialog
        open={pickOpen}
        onOpenChange={setPickOpen}
        price={price}
        initial={editIdx === null ? null : items[editIdx]}
        defaultHunters={Number(head.people || 1)}
        defaultDays={days}
        onSubmit={applyItem}
      />
    </Layout>
  );
};

export default ActCard;