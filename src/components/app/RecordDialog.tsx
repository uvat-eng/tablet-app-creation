import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Row, uploadPhoto } from '@/lib/api';
import Icon from '@/components/ui/icon';
import PickPointDialog from '@/components/app/PickPointDialog';
import { toast } from 'sonner';

export interface Field {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox' | 'photo' | 'coords';
  options?: { value: string; label: string }[];
  placeholder?: string;
  folder?: string;
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
  const [uploading, setUploading] = useState('');
  const [mapFor, setMapFor] = useState<string | null>(null);

  useEffect(() => {
    if (open) setValues(initial ? { ...initial } : {});
  }, [open, initial]);

  const set = (k: string, v: string | number | boolean) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  const input = 'w-full border border-[#e2e2df] px-3 py-2 text-[0.75em] bg-white';

  const pickPhoto = async (key: string, file: File | undefined, folder?: string) => {
    if (!file) return;
    setUploading(key);
    try {
      const url = await uploadPhoto(file, folder || 'photos');
      set(key, url);
      toast.success('Фото загружено');
    } catch {
      toast.error('Не удалось загрузить фото');
    } finally {
      setUploading('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] rounded-none border-black">
        <DialogHeader>
          <DialogTitle className="h-head text-[22px]">{title}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 max-h-[68vh] overflow-y-auto pr-1">
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
              ) : f.type === 'coords' ? (
                <span className="flex gap-2">
                  <input
                    className={input}
                    placeholder={f.placeholder}
                    value={String(values[f.key] ?? '')}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                  <button
                    type="button"
                    className="h-cta-ghost whitespace-nowrap text-[0.7em]"
                    onClick={() => setMapFor(f.key)}
                  >
                    <Icon name="MapPin" size={14} /> На карте
                  </button>
                </span>
              ) : f.type === 'photo' ? (
                <span className="block">
                  {values[f.key] && (
                    <img
                      src={String(values[f.key])}
                      alt=""
                      className="w-full h-[150px] object-cover border border-[#e2e2df] mb-2"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="text-[0.7em]"
                    onChange={(e) => pickPhoto(f.key, e.target.files?.[0], f.folder)}
                  />
                  {uploading === f.key && <span className="h-label block mt-1">Загружаем…</span>}
                </span>
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

      <PickPointDialog
        open={!!mapFor}
        onOpenChange={(v) => !v && setMapFor(null)}
        value={mapFor ? String(values[mapFor] ?? '') : ''}
        onPick={(coords) => {
          if (mapFor) set(mapFor, coords);
          setMapFor(null);
        }}
      />
    </Dialog>
  );
};

export default RecordDialog;