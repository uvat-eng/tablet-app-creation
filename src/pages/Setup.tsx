import { useState } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { uploadPhoto } from '@/lib/api';
import { toast } from 'sonner';

const Setup = () => {
  const { save } = useSettings();
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      setLogo(await uploadPhoto(file, 'brand'));
      toast.success('Логотип загружен');
    } catch {
      toast.error('Не удалось загрузить логотип');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Впишите название хозяйства');
      return;
    }
    setBusy(true);
    await save({ farm_name: name.trim(), logo_url: logo || null, configured: true });
    setBusy(false);
  };

  const input = 'w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white';

  return (
    <div className="h-shell min-h-screen flex items-center justify-center px-6 py-12">
      <form onSubmit={submit} className="w-full max-w-[440px]">
        <div className="h-label">Первый запуск</div>
        <h1 className="h-head text-[34px] mt-2">Настройка хозяйства</h1>
        <p className="h-mono-cap mt-3">
          Впишите название и загрузите логотип — они появятся во всех разделах базы.
        </p>

        <label className="block mt-7">
          <span className="h-label block mb-1">Название охотничьего хозяйства</span>
          <input
            className={input}
            value={name}
            autoFocus
            placeholder="Например: Медвежий Лог"
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <div className="mt-5">
          <span className="h-label block mb-2">Логотип</span>
          {logo && (
            <img
              src={logo}
              alt=""
              className="h-[80px] w-auto object-contain border border-[#e2e2df] p-2 mb-3"
            />
          )}
          <input
            type="file"
            accept="image/*"
            className="text-[0.72em]"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          {uploading && <span className="h-label block mt-2">Загружаем…</span>}
          <div className="h-label mt-2">Можно пропустить и добавить позже в настройках.</div>
        </div>

        <button className="h-cta mt-7 w-full text-center" disabled={busy}>
          {busy ? 'Сохраняем…' : 'Начать работу'}
        </button>
      </form>
    </div>
  );
};

export default Setup;
