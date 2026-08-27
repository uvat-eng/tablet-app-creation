import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Row } from '@/lib/api';

export interface Field {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface RecordDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  fields: Field[];
  initial?: Row | null;
  onSubmit: (values: Row) => void;
}

const RecordDialog = ({ open, onOpenChange, title, fields, initial, onSubmit }: RecordDialogProps) => {
  const [values, setValues] = useState<Row>({});

  useEffect(() => {
    if (open) setValues(initial ? { ...initial } : {});
  }, [open, initial]);

  const set = (k: string, v: string | number | boolean) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  const input = 'w-full border border-[#e2e2df] px-3 py-2 text-[0.75em] bg-white';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] rounded-none border-black">
        <DialogHeader>
          <DialogTitle className="h-head text-[22px]">{title}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 max-h-[60vh] overflow-y-auto pr-1">
          {fields.map((f) => (
            <label key={f.key} className="block">
              <span className="h-label block mb-1">{f.label}</span>
              {f.type === 'select' ? (
                <select
                  className={input}
                  value={String(values[f.key] ?? '')}
                  onChange={(e) => set(f.key, e.target.value)}
                >
                  <option value="">—</option>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea
                  className={input}
                  rows={3}
                  placeholder={f.placeholder}
                  value={String(values[f.key] ?? '')}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              ) : f.type === 'checkbox' ? (
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-black"
                  checked={Boolean(values[f.key])}
                  onChange={(e) => set(f.key, e.target.checked)}
                />
              ) : (
                <input
                  className={input}
                  type={f.type || 'text'}
                  placeholder={f.placeholder}
                  value={String(values[f.key] ?? '')}
                  onChange={(e) =>
                    set(f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)
                  }
                />
              )}
            </label>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <button className="h-cta-ghost" onClick={() => onOpenChange(false)}>
            Отмена
          </button>
          <button className="h-cta" onClick={() => onSubmit(values)}>
            Сохранить
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RecordDialog;
