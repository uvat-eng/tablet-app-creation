import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { Row, createRow, updateRow, removeRow, uploadPhoto } from '@/lib/api';
import { TRANSFER_SECTIONS, TRANSFER_SOURCES, SECTION } from '@/lib/transfers';
import { toast } from 'sonner';

const today = () => new Date().toISOString().slice(0, 10);

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Row | null;
  units: Row[];
  locations: Row[];
  onSaved: () => void;
}

const TransferDialog = ({ open, onOpenChange, initial, units, locations, onSaved }: Props) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [spentOn, setSpentOn] = useState(today());
  const [source, setSource] = useState('transfer');
  const [payer, setPayer] = useState('');
  const [recipient, setRecipient] = useState('');
  const [section, setSection] = useState('');
  const [targetId, setTargetId] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [receipt, setReceipt] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(String(initial?.name || ''));
    setAmount(initial?.amount ? String(Number(initial.amount)) : '');
    setSpentOn(String(initial?.spent_on || today()).slice(0, 10));
    setSource(String(initial?.source || 'transfer'));
    setPayer(String(initial?.payer || ''));
    setRecipient(String(initial?.recipient || ''));
    setSection(String(initial?.section || ''));
    setTargetId(initial?.target_id ? String(initial.target_id) : '');
    setCategory(String(initial?.category || ''));
    setNote(String(initial?.note || ''));
    setReceipt(String(initial?.receipt_url || ''));
  }, [open, initial]);

  const pickReceipt = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      setReceipt(await uploadPhoto(file, 'receipts'));
      toast.success('Чек загружен');
    } catch {
      toast.error('Не удалось загрузить чек');
    } finally {
      setUploading(false);
    }
  };

  const sec = SECTION(section);
  const targets = sec?.key === 'transport' ? units : locations;

  const buildMirror = (): Row | null => {
    if (!sec) return null;
    const sum = Number(amount || 0);
    const cat = category || sec.categories[0]?.key || 'other';
    const base: Row = {
      name: name || 'Расход по переводу',
      category: cat,
      unit_price: sum,
      qty: 1,
      unit: 'шт',
      total: sum,
      spent_on: spentOn,
      vendor: recipient,
      note: `Оплачено: ${source === 'personal' ? 'с личной карты' : 'переводом'}${
        payer ? ` (${payer})` : ''
      }`,
      receipt_url: receipt || null,
    };
    if (sec.key === 'transport') return { ...base, object_id: Number(targetId || 0) };
    if (sec.table === 'house_expenses') return { ...base, facility: sec.key };
    return { ...base, kind: 'location', location_id: Number(targetId || 0) };
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error('Укажите назначение');
      return;
    }
    if (sec?.needsTarget && !targetId) {
      toast.error(`Выберите: ${sec.targetLabel}`);
      return;
    }
    setSaving(true);
    try {
      const oldTable = String(initial?.linked_table || '');
      const oldId = Number(initial?.linked_id || 0);
      const mirror = buildMirror();

      let linkedTable: string | null = null;
      let linkedId: number | null = null;

      if (mirror && sec) {
        if (oldTable === sec.table && oldId) {
          await updateRow(sec.table, { ...mirror, id: oldId });
          linkedTable = sec.table;
          linkedId = oldId;
        } else {
          if (oldTable && oldId) await removeRow(oldTable, oldId);
          const created = await createRow(sec.table, mirror);
          linkedTable = sec.table;
          linkedId = Number(created?.id || 0) || null;
        }
      } else if (oldTable && oldId) {
        await removeRow(oldTable, oldId);
      }

      const payload: Row = {
        name,
        amount: Number(amount || 0),
        spent_on: spentOn,
        source,
        payer,
        recipient,
        section,
        target_id: targetId ? Number(targetId) : null,
        category: category || null,
        note,
        receipt_url: receipt || null,
        linked_table: linkedTable,
        linked_id: linkedId,
      };

      if (initial?.id) await updateRow('transfers', { ...payload, id: initial.id });
      else await createRow('transfers', payload);

      toast.success(sec ? `Записано и отражено в разделе «${sec.label}»` : 'Запись сохранена');
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full border border-[#e2e2df] px-3 py-2 text-[0.75em] bg-white';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] rounded-none border-black">
        <DialogHeader>
          <DialogTitle className="h-head text-[22px]">
            {initial?.id ? 'Правка перевода' : 'Внести перевод'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 max-h-[62vh] overflow-y-auto pr-1">
          <label className="block">
            <span className="h-label block mb-1">Назначение</span>
            <input
              className={input}
              placeholder="на что перевели деньги"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="h-label block mb-1">Сумма, ₽</span>
              <input
                className={input}
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="h-label block mb-1">Дата</span>
              <input
                className={input}
                type="date"
                value={spentOn}
                onChange={(e) => setSpentOn(e.target.value)}
              />
            </label>
          </div>

          <div>
            <span className="h-label block mb-2">Как оплачено</span>
            <div className="grid grid-cols-2 gap-px" style={{ background: '#e2e2df' }}>
              {TRANSFER_SOURCES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSource(s.key)}
                  className="flex items-center gap-2 px-3 py-3 text-left text-[0.7em]"
                  style={{
                    background: source === s.key ? 'var(--hero-accent)' : '#fff',
                    color: source === s.key ? 'var(--hero-accent-contrast)' : 'inherit',
                  }}
                >
                  <Icon name={s.icon} size={14} fallback="Circle" />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="h-label block mb-1">Кто платил</span>
              <input
                className={input}
                placeholder="ФИО"
                value={payer}
                onChange={(e) => setPayer(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="h-label block mb-1">Кому / где</span>
              <input
                className={input}
                placeholder="магазин, сервис"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </label>
          </div>

          <div>
            <span className="h-label block mb-2">Отнести на раздел</span>
            <div className="grid grid-cols-2 gap-px" style={{ background: '#e2e2df' }}>
              <button
                onClick={() => {
                  setSection('');
                  setTargetId('');
                  setCategory('');
                }}
                className="px-3 py-3 text-left text-[0.7em]"
                style={{
                  background: !section ? 'var(--hero-accent)' : '#fff',
                  color: !section ? 'var(--hero-accent-contrast)' : 'inherit',
                }}
              >
                Без привязки
              </button>
              {TRANSFER_SECTIONS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => {
                    setSection(s.key);
                    setTargetId('');
                    setCategory(s.categories[0]?.key || '');
                  }}
                  className="flex items-center gap-2 px-3 py-3 text-left text-[0.7em]"
                  style={{
                    background: section === s.key ? 'var(--hero-accent)' : '#fff',
                    color: section === s.key ? 'var(--hero-accent-contrast)' : 'inherit',
                  }}
                >
                  <Icon name={s.icon} size={14} fallback="Circle" />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {sec?.needsTarget && (
            <label className="block">
              <span className="h-label block mb-1">{sec.targetLabel}</span>
              <select
                className={input}
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
              >
                <option value="">—</option>
                {targets.map((t) => (
                  <option key={String(t.id)} value={String(t.id)}>
                    {String(t.name)}
                  </option>
                ))}
              </select>
            </label>
          )}

          {sec && (
            <label className="block">
              <span className="h-label block mb-1">Статья в разделе</span>
              <select
                className={input}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {sec.categories.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className="h-label block mb-1">Примечание</span>
            <textarea
              className={input}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>

          <div className="block">
            <span className="h-label block mb-1">Скриншот чека</span>
            {receipt && (
              <a href={receipt} target="_blank" rel="noreferrer" className="block mb-2">
                <img
                  src={receipt}
                  alt="Чек"
                  className="w-full h-[150px] object-cover border border-[#e2e2df]"
                />
              </a>
            )}
            <input
              type="file"
              accept="image/*"
              className="text-[0.7em]"
              onChange={(e) => pickReceipt(e.target.files?.[0])}
            />
            {uploading && <span className="h-label block mt-1">Загружаем…</span>}
            {receipt && !uploading && (
              <button className="h-label underline mt-1" onClick={() => setReceipt('')}>
                Убрать чек
              </button>
            )}
          </div>

          {sec && (
            <div className="h-label" style={{ color: 'var(--hero-muted)' }}>
              Запись автоматически появится в разделе «{sec.label}»
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <button className="h-cta-ghost" onClick={() => onOpenChange(false)}>
            Отмена
          </button>
          <button className="h-cta" onClick={save} disabled={saving}>
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransferDialog;