import { useRef, useState } from 'react';
import Icon from '@/components/ui/icon';
import { uploadApk } from '@/lib/api';
import { toast } from 'sonner';

const ApkUploadPanel = () => {
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.apk')) {
      toast.error('Нужен файл приложения с расширением .apk');
      return;
    }

    setBusy(true);
    setPct(0);
    try {
      await uploadApk(file, setPct);
      toast.success('Новая версия загружена — охотники увидят её на странице загрузки');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось загрузить');
    } finally {
      setBusy(false);
      setPct(0);
    }
  };

  return (
    <div className="mt-6">
      <input
        ref={inputRef}
        type="file"
        accept=".apk,application/vnd.android.package-archive"
        className="hidden"
        onChange={pick}
      />

      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 border border-[#1f1f1d] px-5 py-3 text-[0.8em] tracking-wide disabled:opacity-50"
      >
        <Icon name={busy ? 'Loader' : 'Upload'} size={16} className={busy ? 'animate-spin' : ''} />
        {busy ? `Загружаю… ${pct}%` : 'Загрузить новую версию'}
      </button>

      {busy && (
        <div className="mt-3 h-1 w-full max-w-[320px] bg-[#e2e2df]">
          <div
            className="h-full bg-[#1f1f1d] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <div className="h-mono-cap normal-case mt-3 text-[var(--hero-muted)] text-[0.75em]">
        Файл app-release.apk из папки сборки. Загрузка идёт напрямую в хранилище,
        размер не ограничен. Ссылка для охотников не меняется.
      </div>
    </div>
  );
};

export default ApkUploadPanel;
