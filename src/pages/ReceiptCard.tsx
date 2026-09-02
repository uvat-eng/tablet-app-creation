import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '@/components/app/Layout';
import { Row, listRows, updateRow, createRow, removeRow } from '@/lib/api';
import { money } from '@/lib/price';
import { rublesInWords } from '@/lib/rubles';
import PdfButtons from '@/components/app/PdfButtons';
import { toast } from 'sonner';

const dmy = (v: unknown) => {
  const s = String(v || '');
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return s;
  const [y, m, d] = s.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
};

const ReceiptCard = () => {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const [doc, setDoc] = useState<Row>({
    number: '',
    issued_on: new Date().toISOString().slice(0, 10),
    org_name: 'Охотничье хозяйство «Малышенское»',
    org_okpo: '',
    accepted_from: '',
    basis: '',
    amount: 0,
    attachment: '',
    credit_account: '90',
    debit_account: '50',
    chief_accountant: '',
    cashier: '',
  });
  const [loading, setLoading] = useState(!isNew);

  const load = useCallback(async () => {
    if (isNew) return;
    const list = await listRows('receipts');
    const found = list.find((r) => String(r.id) === id);
    if (found) setDoc(found);
    setLoading(false);
  }, [id, isNew]);

  useEffect(() => {
    load();
  }, [load]);

  const amount = Number(doc.amount || 0);
  const words = rublesInWords(amount);

  const save = async () => {
    const body: Row = {
      number: String(doc.number || ''),
      issued_on: String(doc.issued_on || '').slice(0, 10) || null,
      org_name: String(doc.org_name || ''),
      org_okpo: String(doc.org_okpo || ''),
      accepted_from: String(doc.accepted_from || ''),
      basis: String(doc.basis || ''),
      amount,
      amount_words: words,
      attachment: String(doc.attachment || ''),
      credit_account: String(doc.credit_account || ''),
      debit_account: String(doc.debit_account || ''),
      chief_accountant: String(doc.chief_accountant || ''),
      cashier: String(doc.cashier || ''),
      check_id: doc.check_id ? Number(doc.check_id) : null,
      booking_id: doc.booking_id ? Number(doc.booking_id) : null,
    };
    if (isNew) {
      const created = await createRow('receipts', body);
      toast.success('Чек сохранён');
      navigate(`/documents/receipt/${created.id}`, { replace: true });
      return;
    }
    await updateRow('receipts', { ...body, id: Number(id) });
    toast.success('Чек сохранён');
  };

  const drop = async () => {
    if (!confirm('Удалить чек?')) return;
    try {
      await removeRow('receipts', Number(id));
      toast.success('Чек удалён');
      navigate('/documents');
    } catch {
      toast.error('Не удалось удалить');
    }
  };

  if (loading) {
    return (
      <Layout index="Раздел / Документы" title="Чек">
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
        value={String(doc[key] ?? '')}
        onChange={(e) => setDoc((p) => ({ ...p, [key]: e.target.value }))}
      />
    </label>
  );

  return (
    <Layout
      index="Раздел / Документы"
      title={`Чек — ПКО № ${doc.number || id}`}
      lede={`Принято от ${doc.accepted_from || '—'} · ${money(amount)}`}
      action={
        <span className="flex gap-2 no-print">
          <Link className="h-cta-ghost" to="/documents">
            К списку
          </Link>
          {doc.check_id && (
            <Link className="h-cta-ghost" to={`/documents/act/${doc.check_id}`}>
              Открыть акт
            </Link>
          )}
          {!isNew && <PdfButtons kind="receipt" id={String(id)} />}
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
        {field('Номер документа', 'number')}
        {field('Дата составления', 'issued_on', 'date')}
        {field('Организация', 'org_name')}
        {field('Код по ОКПО', 'org_okpo')}
        {field('Принято от', 'accepted_from')}
        {field('Основание', 'basis')}
        {field('Сумма, ₽', 'amount', 'number')}
        {field('Приложение', 'attachment')}
        {field('Кредит (счёт)', 'credit_account')}
        {field('Дебет (счёт)', 'debit_account')}
        {field('Главный бухгалтер', 'chief_accountant')}
        {field('Кассир', 'cashier')}
      </div>

      <div id="check-print" className="border border-black bg-white p-6 max-w-[820px]">
        <div className="flex justify-between text-[0.62em] uppercase tracking-[0.08em]">
          <span>{String(doc.org_name || '')}</span>
          <span>Унифицированная форма № КО-1</span>
        </div>
        <div className="mt-1 text-[0.6em] text-[var(--hero-muted)]">
          Код по ОКПО: {String(doc.org_okpo || '—')}
        </div>

        <div className="mt-6 text-center">
          <div className="h-head text-[22px]">Приходный кассовый ордер</div>
          <div className="mt-2 text-[0.72em]">
            № {String(doc.number || '—')} от {dmy(doc.issued_on)}
          </div>
        </div>

        <table className="w-full mt-6 border-collapse text-[0.68em]">
          <tbody>
            <tr>
              <td className="border border-black px-3 py-2 w-[35%] h-label">Дебет</td>
              <td className="border border-black px-3 py-2 w-[15%]">
                {String(doc.debit_account || '')}
              </td>
              <td className="border border-black px-3 py-2 w-[35%] h-label">Кредит</td>
              <td className="border border-black px-3 py-2">
                {String(doc.credit_account || '')}
              </td>
            </tr>
            <tr>
              <td className="border border-black px-3 py-2 h-label">Сумма, руб. коп.</td>
              <td className="border border-black px-3 py-2 font-bold" colSpan={3}>
                {money(amount)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-6 grid gap-4 text-[0.72em]">
          <div>
            <span className="h-label block">Принято от</span>
            <div className="border-b border-black pb-1 mt-1">
              {String(doc.accepted_from || '—')}
            </div>
          </div>
          <div>
            <span className="h-label block">Основание</span>
            <div className="border-b border-black pb-1 mt-1">{String(doc.basis || '—')}</div>
          </div>
          <div>
            <span className="h-label block">Сумма прописью</span>
            <div className="border-b border-black pb-1 mt-1">{words}</div>
          </div>
          <div>
            <span className="h-label block">Приложение</span>
            <div className="border-b border-black pb-1 mt-1">{String(doc.attachment || '—')}</div>
          </div>
        </div>

        <div className="mt-10 grid gap-5 text-[0.7em]">
          {[
            { l: 'Главный бухгалтер', v: doc.chief_accountant },
            { l: 'Кассир', v: doc.cashier },
          ].map((s) => (
            <div key={s.l} className="flex gap-6 items-end">
              <span className="w-[170px] h-label">{s.l}</span>
              <span className="flex-1 border-b border-black max-w-[200px]" />
              <span>{String(s.v || '')}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-4 border-t border-dashed border-black text-[0.62em] uppercase tracking-[0.08em]">
          Квитанция к приходному кассовому ордеру № {String(doc.number || '—')} от{' '}
          {dmy(doc.issued_on)} · Принято от {String(doc.accepted_from || '—')} ·{' '}
          {money(amount)} · {words}
        </div>
      </div>
    </Layout>
  );
};

export default ReceiptCard;