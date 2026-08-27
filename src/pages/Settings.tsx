import { useEffect, useState } from 'react';
import Layout from '@/components/app/Layout';
import { useSettings } from '@/context/SettingsContext';
import { uploadPhoto } from '@/lib/api';
import { toast } from 'sonner';

const Settings = () => {
  const { settings, save } = useSettings();
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setName(settings.farm_name);
    setLogo(settings.logo_url || '');
  }, [settings]);

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

  const submit = async () => {
    await save({ farm_name: name.trim(), logo_url: logo || null, configured: true });
    toast.success('Настройки сохранены');
  };

  const input = 'w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white max-w-[420px]';

  return (
    <Layout
      index="Раздел / Настройки"
      title="Настройки хозяйства"
      lede="Название и логотип показываются в меню и на всех экранах базы."
      action={
        <button className="h-cta" onClick={submit}>
          Сохранить
        </button>
      }
    >
      <label className="block">
        <span className="h-label block mb-1">Название охотничьего хозяйства</span>
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <div className="mt-7">
        <span className="h-label block mb-2">Логотип</span>
        {logo && (
          <img
            src={logo}
            alt=""
            className="h-[90px] w-auto object-contain border border-[#e2e2df] p-2 mb-3"
          />
        )}
        <input
          type="file"
          accept="image/*"
          className="text-[0.72em]"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        {uploading && <span className="h-label block mt-2">Загружаем…</span>}
        {logo && (
          <button className="h-label underline block mt-3" onClick={() => setLogo('')}>
            Убрать логотип
          </button>
        )}
      </div>
    </Layout>
  );
};

export default Settings;
