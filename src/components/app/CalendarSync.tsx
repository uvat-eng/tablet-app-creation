import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { CalendarFeed, getCalendarFeed } from '@/lib/api';
import { toast } from 'sonner';

const STEPS: Record<string, { title: string; icon: string; steps: string[] }> = {
  android: {
    title: 'Android — Google Календарь',
    icon: 'Smartphone',
    steps: [
      'Откройте на компьютере calendar.google.com — на телефоне подписка не добавляется, так устроен Google.',
      'Слева «Другие календари» → плюс → «Добавить по URL».',
      'Вставьте скопированную ссылку и нажмите «Добавить календарь».',
      'Через минуту брони появятся в Google Календаре на телефоне.',
    ],
  },
  iphone: {
    title: 'iPhone и iPad',
    icon: 'Apple',
    steps: [
      'Настройки → Календарь → Учётные записи → Добавить учётную запись.',
      'Выберите «Другое» → «Подписной календарь».',
      'Вставьте ссылку в поле «Сервер» и нажмите «Далее», затем «Сохранить».',
      'Брони появятся в стандартном календаре iPhone.',
    ],
  },
};

const CalendarSync = () => {
  const [open, setOpen] = useState(false);
  const [feed, setFeed] = useState<CalendarFeed | null>(null);
  const [tab, setTab] = useState<'android' | 'iphone'>('android');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || feed) return;
    getCalendarFeed()
      .then(setFeed)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Ошибка'));
  }, [open, feed]);

  const copy = async () => {
    if (!feed) return;
    try {
      await navigator.clipboard.writeText(feed.url);
      toast.success('Ссылка скопирована');
    } catch {
      toast.error('Скопируйте ссылку вручную');
    }
  };

  const reset = async () => {
    if (!window.confirm('Создать новую ссылку? Старая перестанет работать.')) return;
    setBusy(true);
    try {
      setFeed(await getCalendarFeed(true));
      toast.success('Ссылка обновлена — подпишитесь заново');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  const guide = STEPS[tab];

  return (
    <>
      <button className="h-cta-ghost" onClick={() => setOpen(true)}>
        <Icon name="CalendarSync" size={15} fallback="Calendar" /> В календарь телефона
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[620px] rounded-none border-black">
          <DialogHeader>
            <DialogTitle className="h-head text-[22px]">Брони в календаре телефона</DialogTitle>
          </DialogHeader>

          <div className="grid gap-5 max-h-[64vh] overflow-y-auto pr-1">
            <p className="text-sm text-[#6d6d6d]">
              Подпишите телефон на этот календарь один раз — дальше все брони будут приходить
              туда сами. Новая бронь, перенос дат, отмена — телефон подхватит без вашего участия.
            </p>

            <div>
              <span className="h-label block mb-2">Ссылка для подписки</span>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={feed?.url || 'Получаем ссылку…'}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 border border-[#e2e2df] px-3 py-2 text-[0.68em] bg-white"
                />
                <button className="h-cta whitespace-nowrap" onClick={copy} disabled={!feed}>
                  <Icon name="Copy" size={14} /> Копировать
                </button>
              </div>
              {feed && (
                <div className="h-label mt-2">
                  {feed.reads > 0
                    ? `Телефон обращался к календарю ${feed.reads} раз`
                    : 'Подписки пока нет — добавьте ссылку в календарь'}
                </div>
              )}
            </div>

            <div>
              <div className="flex gap-2 mb-3">
                {(['android', 'iphone'] as const).map((k) => (
                  <button
                    key={k}
                    className={tab === k ? 'h-cta' : 'h-cta-ghost'}
                    onClick={() => setTab(k)}
                  >
                    {k === 'android' ? 'Android' : 'iPhone'}
                  </button>
                ))}
              </div>

              <div className="border border-[#e2e2df] p-4">
                <div className="h-label flex items-center gap-2 mb-3">
                  <Icon name={guide.icon} size={14} fallback="Smartphone" />
                  {guide.title}
                </div>
                <ol className="space-y-2">
                  {guide.steps.map((s, i) => (
                    <li key={s} className="text-sm flex gap-3">
                      <span className="h-label shrink-0">{i + 1}</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="border border-[#e2e2df] p-4 bg-[var(--hero-surface)]">
              <div className="h-label mb-2">Как часто обновляется</div>
              <p className="text-sm text-[#6d6d6d]">
                iPhone проверяет календарь примерно раз в 15 минут, Google — раз в несколько
                часов. Это ограничение самих телефонов, ускорить его нельзя. В приложении все
                изменения видны сразу.
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 flex-wrap">
              <span className="text-xs text-[#a3a39d] max-w-[60ch]">
                Ссылка личная — не передавайте её посторонним, по ней виден список броней.
              </span>
              <button className="h-label underline whitespace-nowrap" onClick={reset} disabled={busy}>
                Сменить ссылку
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CalendarSync;
