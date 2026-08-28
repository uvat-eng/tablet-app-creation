import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { Row, createRow, updateRow } from '@/lib/api';
import { HELP_KINDS, HELP_KIND } from '@/lib/help';
import { toast } from 'sonner';

const today = () => new Date().toISOString().slice(0, 10);

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  guestId: number;
  guestName: string;
  initial?: Row | null;
  onSaved: () => void;
}

const HelpDialog = ({ open, onOpenChange, guestId, guestName, initial, onSaved }: Props) => {
  const [kind, setKind] = useState('work_base');
  const [workOn, setWorkOn] = useState(today());
  const [qty, setQty] = useState('');
  const [hours, setHours] = useState('');
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind(String(initial?.kind || 'work_base'));
    setWorkOn(String(initial?.work_on || today()).slice(0, 10));
    setQty(initial?.qty ? String(Number(initial.qty)) : '');
    setHours(initial?.hours ? String(Number(initial.hours)) : '');
    setPlace(String(initial?.place || ''));
    setNote(String(initial?.note || ''));
  }, [open, initial]);

  const cur = HELP_KIND(kind);
  const isMaterial = Boolean(cur?.material);

  const save = async () => {
    setSaving(true);
    const payload: Row = {
      guest_id: guestId,
      hunter_name: guestName,
      kind,
      work_on: workOn,
      qty: Number(isMaterial ? qty || 0 : hours || 0),
      unit: cur?.unit || 'ч',
      hours: Number(isMaterial ? 0 : hours || 0),
      place,
      note,
      status: 'done',
    };
    try {
      if (initial?.id) await updateRow('biotech_works', { ...payload, id: initial.id });
      else await createRow('biotech_works', payload);
      toast.success('Помощь записана');
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
      <DialogContent className="max-w-[520px] rounded-none border-black">
        <DialogHeader>
          <DialogTitle className="h-head text-[22px]">
            {initial?.id ? 'Правка помощи' : 'Помочь хозяйству'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <span className="h-label block mb-2">Чем помогаем</span>
            <div className="grid grid-cols-2 gap-px" style={{ background: '#e2e2df' }}>
              {HELP_KINDS.map((k) => (
                <button
                  key={k.key}
                  onClick={() => setKind(k.key)}
                  className="flex items-center gap-2 px-3 py-3 text-left text-[0.7em]"
                  style={{
                    background: kind === k.key ? 'var(--hero-accent)' : '#fff',
                    color: kind === k.key ? 'var(--hero-accent-contrast)' : 'inherit',
                  }}
                >
                  <Icon name={k.icon} size={14} fallback="Circle" />
                  {k.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="h-label block mb-1">Дата</span>
            <input
              className={input}
              type="date"
              value={workOn}
              onChange={(e) => setWorkOn(e.target.value)}
            />
          </label>

          {isMaterial ? (
            <label className="block">
              <span className="h-label block mb-1">Сколько передано, {cur?.unit}</span>
              <input
                className={input}
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </label>
          ) : (
            <label className="block">
              <span className="h-label block mb-1">Отработано часов</span>
              <input
                className={input}
                type="number"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </label>
          )}

          <label className="block">
            <span className="h-label block mb-1">Где</span>
            <input
              className={input}
              placeholder="угодье, поле, база"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="h-label block mb-1">Что делали</span>
            <textarea
              className={input}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
        </div>

        <DialogFooter className="gap-2">
          <button className="h-cta-ghost" onClick={() => onOpenChange(false)}>
            Отмена
          </button>
          <button className="h-cta" onClick={save} disabled={saving}>
            {saving ? 'Сохраняем…' : 'Записать'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HelpDialog;
