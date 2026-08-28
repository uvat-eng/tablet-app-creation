import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Layout from '@/components/app/Layout';
import { Row, listRows, createRow, updateRow } from '@/lib/api';
import { PriceItem, loadPriceItems, lineSum, money, GROUP_LABELS } from '@/lib/price';
import { rublesInWords } from '@/lib/rubles';
import { toast } from 'sonner';

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
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const price = await loadPriceItems();
    if (isNew) {
      setItems(price);
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
      const merged = price.map((p) => {
        const s = saved.find((x) => x.name === p.name || x.service_id === p.service_id);
        return s
          ? { ...p, hunters: s.hunters || 0, days: s.days || 0, tariff: s.tariff, discount: s.discount || 0 }
          : p;
      });
      const orphans = saved.filter((s) => !price.some((p) => p.name === s.name));
      setItems([...merged, ...orphans]);
      setDiscount(Number(found.discount_pct || 0));
    } else {
      setItems(price);
    }
    setLoading(false);
  }, [id, isNew]);

  useEffect(() => {
    load();
  }, [load]);

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

  const patch = (idx: number, field: keyof PriceItem, value: string) => {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [field]: Number(value || 0) } : it)),
    );
  };

  const save = async () => {
    const used = items.filter((i, idx) => totals.sums[idx] !== 0 || i.hunters || i.days);
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
          <button className="h-cta-ghost" onClick={() => window.print()}>
            Скачать PDF
          </button>
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
        <label className="block">
          <span className="h-label">Скидка, %</span>
          <input
            type="number"
            className="mt-1 w-full border border-[#e2e2df] px-3 py-2 text-[0.72em] bg-white"
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value || 0))}
          />
        </label>
      </div>

      <div id="check-print" className="border border-[#e2e2df] bg-white p-6">
        <div className="text-center mb-6">
          <div className="h-head text-[22px]">
            Акт выполненных работ {isNew ? '' : `№ ${id}`}
          </div>
          <div className="h-label mt-1">Охотничье хозяйство «Малышенское»</div>
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

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="bg-[var(--hero-surface)]">
                {['Статья', 'Кол-во', 'Дней', 'Тариф', 'Скидка %', 'Сумма', 'Примечание'].map(
                  (h) => (
                    <th key={h} className="h-label text-left px-2 py-2 font-normal">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => {
                const sum = totals.sums[idx];
                const dim = sum === 0;
                const firstOfCat =
                  idx === 0 || (items[idx - 1].category || 'Прочее') !== (it.category || 'Прочее');
                return (
                  <Fragment key={`${it.name}-${idx}`}>
                    {firstOfCat && (
                      <tr>
                        <td colSpan={7} className="px-2 pt-4 pb-1 h-label">
                          {it.category || 'Прочее'}
                        </td>
                      </tr>
                    )}
                    <tr
                      className={`border-t border-[#e2e2df] ${dim ? 'text-[var(--hero-muted)] hide-empty' : ''}`}
                    >
                      <td className="px-2 py-1 text-[0.7em]">{it.name}</td>
                      {(['hunters', 'days', 'tariff', 'discount'] as const).map((f) => (
                        <td key={f} className="px-2 py-1">
                          <input
                            type="number"
                            className="w-[74px] border border-[#e2e2df] px-2 py-1 text-[0.7em]"
                            value={it[f]}
                            disabled={f === 'days' && it.mode !== 'perDayPerHunter'}
                            onChange={(e) => patch(idx, f, e.target.value)}
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1 text-[0.7em] whitespace-nowrap">{money(sum)}</td>
                      <td className="px-2 py-1 text-[0.6em]">
                        {it.note || GROUP_LABELS[it.group]}
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
              <tr className="border-t-2 border-black">
                <td className="px-2 py-2 h-label" colSpan={5}>
                  Итого
                </td>
                <td className="px-2 py-2 text-[0.75em] font-bold whitespace-nowrap" colSpan={2}>
                  {money(totals.total)}
                </td>
              </tr>
              <tr>
                <td className="px-2 py-1 h-label" colSpan={5}>
                  Скидка {discount}%
                </td>
                <td className="px-2 py-1 text-[0.75em] whitespace-nowrap" colSpan={2}>
                  −{money(totals.cut)}
                </td>
              </tr>
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
    </Layout>
  );
};

export default ActCard;