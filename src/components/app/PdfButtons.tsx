import { useState } from 'react';
import { toast } from 'sonner';
import { ActKind, buildActPdf, isOnline } from '@/lib/api';

interface Props {
  kind: ActKind;
  id: number | string;
  disabled?: boolean;
  onDone?: () => void;
}

const PdfButtons = ({ kind, id, disabled, onDone }: Props) => {
  const [busy, setBusy] = useState<'open' | 'print' | null>(null);

  const make = async (mode: 'open' | 'print') => {
    if (!isOnline()) {
      toast.error('Нет связи. PDF собирается на сервере — нужен интернет.');
      return;
    }
    setBusy(mode);
    const tab = mode === 'open' ? window.open('', '_blank') : null;
    try {
      const doc = await buildActPdf(kind, Number(id));
      if (mode === 'open') {
        if (tab) {
          tab.location.href = doc.url;
        } else {
          window.open(doc.url, '_blank');
        }
        toast.success('Документ открыт и сохранён в «Готовые документы»');
      } else {
        const frame = document.createElement('iframe');
        frame.style.position = 'fixed';
        frame.style.right = '0';
        frame.style.bottom = '0';
        frame.style.width = '0';
        frame.style.height = '0';
        frame.style.border = '0';
        frame.src = doc.url;
        frame.onload = () => {
          try {
            frame.contentWindow?.focus();
            frame.contentWindow?.print();
          } catch {
            window.open(doc.url, '_blank');
          }
        };
        document.body.appendChild(frame);
        setTimeout(() => frame.remove(), 60000);
        toast.success('Документ готов — выберите принтер');
      }
      onDone?.();
    } catch (e) {
      tab?.close();
      toast.error(e instanceof Error ? e.message : 'Не удалось собрать документ');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <button
        className="h-cta-ghost"
        disabled={disabled || busy !== null}
        onClick={() => make('open')}
      >
        {busy === 'open' ? 'Собираем…' : 'Открыть PDF'}
      </button>
      <button
        className="h-cta-ghost"
        disabled={disabled || busy !== null}
        onClick={() => make('print')}
      >
        {busy === 'print' ? 'Готовим…' : 'Печать'}
      </button>
    </>
  );
};

export default PdfButtons;
