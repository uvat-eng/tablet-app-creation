import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface Asset {
  file: string;
  label: string;
  note: string;
}

const ASSETS: Asset[] = [
  { file: 'store-icon-512.png', label: 'Иконка 512 × 512', note: 'основная иконка карточки' },
  { file: 'store-icon-1024.png', label: 'Иконка 1024 × 1024', note: 'запас в большем размере' },
  { file: 'store-banner-1024x500.png', label: 'Баннер 1024 × 500', note: 'шапка карточки' },
];

const StoreAssets = () => {
  const [busy, setBusy] = useState('');

  const save = async (a: Asset) => {
    setBusy(a.file);
    try {
      const res = await fetch('/' + a.file);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = a.file;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast.success('Файл сохранён в «Загрузки»');
    } catch {
      window.open('/' + a.file, '_blank');
      toast.message('Открыли картинку — нажмите и удерживайте, чтобы сохранить');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="border border-[#e2e2df]">
      {ASSETS.map((a, i) => (
        <div
          key={a.file}
          className="px-4 py-4 flex flex-wrap items-center gap-4"
          style={{ borderTop: i ? '1px solid #e2e2df' : 'none' }}
        >
          <img
            src={'/' + a.file}
            alt={a.label}
            className="w-[74px] h-[74px] object-contain border border-[#e2e2df] shrink-0 bg-white"
          />
          <div className="flex-1 min-w-[140px]">
            <div className="text-[0.82em]">{a.label}</div>
            <div className="h-label mt-1">{a.note}</div>
          </div>
          <button
            className="h-cta-ghost"
            disabled={busy === a.file}
            onClick={() => save(a)}
          >
            <Icon name="Download" size={14} />
            {busy === a.file ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      ))}

      <div
        className="px-4 py-3 flex gap-3"
        style={{ borderTop: '1px solid #e2e2df', background: 'var(--hero-surface)' }}
      >
        <Icon name="Info" size={15} className="shrink-0 mt-[2px]" />
        <p className="text-[0.76em] leading-relaxed">
          Если кнопка не сработала — нажмите на саму картинку и удерживайте палец,
          затем выберите «Сохранить изображение». Файл попадёт в галерею телефона.
        </p>
      </div>
    </div>
  );
};

export default StoreAssets;
