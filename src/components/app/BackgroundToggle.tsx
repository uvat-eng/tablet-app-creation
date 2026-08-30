import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/context/AuthContext';
import { canClubChat } from '@/lib/permissions';
import { askNotify } from '@/lib/notify';
import {
  bgAvailable,
  bgStart,
  bgStop,
  bgRunning,
  bgBatterySettings,
} from '@/lib/bgService';
import { toast } from 'sonner';

const KEY = 'hb_bg_on';

const BackgroundToggle = () => {
  const { user } = useAuth();
  const [on, setOn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!bgAvailable()) return;
    setReady(true);
    bgRunning().then((r) => setOn(r && localStorage.getItem(KEY) === '1'));
  }, []);

  if (!ready) return null;

  const toggle = async () => {
    if (on) {
      await bgStop();
      localStorage.setItem(KEY, '0');
      setOn(false);
      toast.success('Фоновые уведомления выключены');
      return;
    }

    const allowed = await askNotify();
    if (!allowed) {
      toast.error('Разрешите уведомления в настройках телефона');
      return;
    }
    const ok = await bgStart(canClubChat(user));
    if (!ok) {
      toast.error('Не удалось запустить');
      return;
    }
    localStorage.setItem(KEY, '1');
    setOn(true);
    toast.success('Уведомления будут приходить всегда');
  };

  return (
    <div className="border border-[#e2e2df] p-4 mb-6">
      <div className="flex flex-wrap items-center gap-3">
        <Icon name={on ? 'BellRing' : 'BellOff'} size={18} fallback="Bell" />
        <span className="text-[0.8em] flex-1 min-w-[220px]">
          {on
            ? 'Уведомления приходят даже при закрытом приложении'
            : 'Получать сообщения при закрытом приложении'}
        </span>
        <button className={on ? 'h-cta-ghost' : 'h-cta'} onClick={toggle}>
          {on ? 'Выключить' : 'Включить'}
        </button>
      </div>

      {on && (
        <div className="mt-3 pt-3 border-t border-[#e2e2df]">
          <div className="h-mono-cap normal-case text-[var(--hero-muted)] leading-relaxed">
            В шторке телефона появилась строчка «Ожидание новых сообщений» — так
            Android показывает, что приложение работает. Убрать её нельзя, но она
            беззвучная и не мешает.
          </div>
          <button
            className="h-cta-ghost mt-3"
            onClick={() => {
              bgBatterySettings();
              toast.info('Батарея → Без ограничений');
            }}
          >
            <Icon name="BatteryCharging" size={14} fallback="Zap" />
            Снять ограничения батареи
          </button>
        </div>
      )}
    </div>
  );
};

export default BackgroundToggle;
