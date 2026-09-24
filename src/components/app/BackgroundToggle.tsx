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
import {
  webPushSupported,
  webPushState,
  webPushEnable,
  webPushDisable,
  webPushTest,
  isIOS,
  isStandalone,
} from '@/lib/webPush';
import { toast } from 'sonner';

const KEY = 'hb_bg_on';

const BackgroundToggle = () => {
  const { user } = useAuth();
  const native = bgAvailable();

  const [on, setOn] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (native) {
      setReady(true);
      bgRunning().then((r) => setOn(r && localStorage.getItem(KEY) === '1'));
      return;
    }
    if (!webPushSupported()) return;
    setReady(true);
    webPushState().then((s) => {
      setOn(s === 'on');
      setBlocked(s === 'blocked');
    });
  }, [native]);

  const iosNeedsHome = isIOS() && !isStandalone();

  if (!ready && !iosNeedsHome) return null;

  if (iosNeedsHome) {
    return (
      <div className="border border-[#e2e2df] p-4 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Icon name="Share" size={17} fallback="Upload" />
          <span className="text-[0.8em]">Чтобы получать уведомления на iPhone</span>
        </div>
        <div className="h-mono-cap normal-case text-[var(--hero-muted)] leading-relaxed">
          Нажмите в Safari кнопку «Поделиться» внизу экрана, выберите
          «На экран „Домой“» и открывайте приложение с этого значка.
          После этого здесь появится кнопка включения уведомлений.
        </div>
      </div>
    );
  }

  const toggle = async () => {
    setBusy(true);
    try {
      if (on) {
        if (native) {
          await bgStop();
          localStorage.setItem(KEY, '0');
        } else {
          await webPushDisable();
        }
        setOn(false);
        toast.success('Уведомления выключены');
        return;
      }

      if (native) {
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
      } else {
        const ok = await webPushEnable();
        if (!ok) {
          setBlocked(Notification.permission === 'denied');
          toast.error('Не удалось включить уведомления');
          return;
        }
      }
      setOn(true);
      toast.success('Уведомления будут приходить всегда');
    } finally {
      setBusy(false);
    }
  };

  if (blocked) {
    return (
      <div className="border border-[#e2e2df] p-4 mb-6 flex flex-wrap items-center gap-3">
        <Icon name="BellOff" size={18} fallback="Bell" />
        <span className="text-[0.78em] flex-1 min-w-[220px]">
          Уведомления запрещены в настройках браузера — разрешите их для этого сайта
        </span>
      </div>
    );
  }

  return (
    <div className="border border-[#e2e2df] p-4 mb-6">
      <div className="flex flex-wrap items-center gap-3">
        <Icon name={on ? 'BellRing' : 'BellOff'} size={18} fallback="Bell" />
        <span className="text-[0.8em] flex-1 min-w-[220px]">
          {on
            ? 'Уведомления приходят даже при закрытом приложении'
            : 'Получать сообщения при закрытом приложении'}
        </span>
        <button className={on ? 'h-cta-ghost' : 'h-cta'} disabled={busy} onClick={toggle}>
          {busy ? 'Минуту…' : on ? 'Выключить' : 'Включить'}
        </button>
      </div>

      {on && (
        <div className="mt-3 pt-3 border-t border-[#e2e2df] flex flex-wrap gap-3 items-center">
          {native ? (
            <>
              <div className="h-mono-cap normal-case text-[var(--hero-muted)] leading-relaxed w-full">
                В шторке телефона появилась строчка «Ожидание новых сообщений» — так
                система показывает, что приложение работает. Убрать её нельзя, но она
                беззвучная и не мешает.
              </div>
              <button
                className="h-cta-ghost"
                onClick={() => {
                  bgBatterySettings();
                  toast.info('Батарея → Без ограничений');
                }}
              >
                <Icon name="BatteryCharging" size={14} fallback="Zap" />
                Снять ограничения батареи
              </button>
            </>
          ) : (
            <button
              className="h-cta-ghost"
              onClick={async () => {
                const n = await webPushTest();
                toast[n > 0 ? 'success' : 'error'](
                  n > 0 ? 'Проверочное уведомление отправлено' : 'Не дошло — проверьте связь',
                );
              }}
            >
              <Icon name="Bell" size={14} />
              Проверить уведомление
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BackgroundToggle;