import { useRef, useState } from 'react';
import Icon from '@/components/ui/icon';
import { BackupFile, downloadBackup, checkBackup, restoreBackup } from '@/lib/api';
import { clearAll } from '@/lib/localCache';
import { toast } from 'sonner';

const LABEL: Record<string, string> = {
  objects: 'объекты',
  guests: 'гости',
  services: 'услуги',
  bookings: 'брони',
  booking_services: 'услуги в бронях',
  payments: 'платежи',
  checks: 'расчёты',
  receipts: 'квитанции',
  trophies: 'трофеи',
  locations: 'локации',
  map_layers: 'слои карты',
  reviews: 'отзывы',
  house_expenses: 'расходы по базе',
  expenses: 'расходы',
  settings: 'настройки',
  staff: 'сотрудники',
};

const BackupPanel = () => {
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [info, setInfo] = useState<{ total: number; created_at: string; created_by: string } | null>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    setBusy(true);
    try {
      const dump = await downloadBackup();
      const blob = new Blob([JSON.stringify(dump, null, 1)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const d = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `база-хозяйства-${d}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Выгружено записей: ${dump.total}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось выгрузить');
    } finally {
      setBusy(false);
    }
  };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BackupFile;
      const chk = await checkBackup(parsed);
      setPending(parsed);
      setInfo(chk);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Файл повреждён или не подходит');
      setPending(null);
      setInfo(null);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const apply = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const r = await restoreBackup(pending);
      clearAll();
      toast.success(`Восстановлено записей: ${r.total}`);
      if (r.skipped?.length) toast.warning(`Пропущено строк: ${r.skipped.length}`);
      setPending(null);
      setInfo(null);
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось восстановить');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-10 pt-8 h-rule">
      <span className="h-label block mb-2">Резервная копия базы</span>
      <p className="text-sm text-[#6d6d6d] mb-4 max-w-[60ch]">
        Выгрузите всю базу хозяйства в один файл и храните его отдельно — на компьютере, флешке
        или в облаке. Из этого файла можно восстановить данные, если что-то потерялось.
      </p>

      <div className="flex flex-wrap gap-3 items-center">
        <button className="h-cta" onClick={save} disabled={busy}>
          <Icon name="Download" size={15} /> Выгрузить базу в файл
        </button>

        <button className="h-cta-ghost" onClick={() => fileRef.current?.click()} disabled={busy}>
          <Icon name="Upload" size={15} /> Загрузить из файла
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </div>

      {pending && info && (
        <div className="mt-5 border border-[#c58a00] p-4 max-w-[560px]">
          <div className="text-sm font-bold mb-1">Проверьте, что загружаете</div>
          <div className="text-sm text-[#6d6d6d]">
            Копия от {new Date(info.created_at + 'Z').toLocaleString('ru-RU')}, сделал{' '}
            {info.created_by}. Записей в файле: <b>{info.total}</b>.
          </div>

          <ul className="mt-2 text-xs text-[#6d6d6d] flex flex-wrap gap-x-4 gap-y-1">
            {Object.entries(pending.counts || {})
              .filter(([, c]) => c > 0)
              .map(([t, c]) => (
                <li key={t}>
                  {LABEL[t] || t}: {c}
                </li>
              ))}
          </ul>

          <p className="mt-3 text-sm">
            Записи из файла заменят текущие с теми же номерами. То, что вы внесли позже и чего нет
            в файле, останется на месте.
          </p>

          <div className="mt-4 flex gap-3">
            <button className="h-cta" onClick={apply} disabled={busy}>
              {busy ? 'Восстанавливаем…' : 'Восстановить'}
            </button>
            <button
              className="h-cta-ghost"
              onClick={() => {
                setPending(null);
                setInfo(null);
              }}
              disabled={busy}
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupPanel;
