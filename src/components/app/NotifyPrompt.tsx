import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { canNotify, notifyState, askNotify } from '@/lib/notify';
import { toast } from 'sonner';

const HIDE_KEY = 'hb_notify_prompt_hidden';

const NotifyPrompt = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!canNotify()) return;
    if (localStorage.getItem(HIDE_KEY) === '1') return;
    if (notifyState() === 'default') setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="border border-[#e2e2df] p-4 mb-6 flex flex-wrap items-center gap-3">
      <Icon name="Bell" size={18} fallback="Circle" />
      <span className="text-[0.78em] flex-1 min-w-[200px]">
        Включить уведомления о новых сообщениях?
      </span>
      <button
        className="h-cta"
        onClick={async () => {
          const ok = await askNotify();
          setShow(false);
          localStorage.setItem(HIDE_KEY, '1');
          toast[ok ? 'success' : 'error'](
            ok ? 'Уведомления включены' : 'Уведомления не разрешены',
          );
        }}
      >
        Включить
      </button>
      <button
        className="h-cta-ghost"
        onClick={() => {
          setShow(false);
          localStorage.setItem(HIDE_KEY, '1');
        }}
      >
        Не сейчас
      </button>
    </div>
  );
};

export default NotifyPrompt;
