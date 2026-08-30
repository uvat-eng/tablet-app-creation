import { useCallback, useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import ChatPanel from '@/components/app/ChatPanel';
import { ChatThread, loadThreads, fmtWhen } from '@/lib/chatApi';

const POLL_MS = 25000;

const MessagesTab = () => {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [active, setActive] = useState<ChatThread | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const list = await loadThreads();
      setThreads(list);
    } catch {
      /* нет связи — оставим прежний список */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const totalUnread = threads.reduce((s, t) => s + t.unread, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="h-head text-[22px]">Переписка с охотниками</div>
        {totalUnread > 0 && (
          <span
            className="h-label px-2 py-1"
            style={{ background: '#e53935', color: '#fff' }}
          >
            новых: {totalUnread}
          </span>
        )}
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[minmax(240px,340px)_1fr]">
        <div
          className={`border border-[#e2e2df] overflow-y-auto ${
            active ? 'hidden lg:block' : ''
          }`}
          style={{ maxHeight: 520 }}
        >
          {loading && threads.length === 0 && (
            <div className="h-label p-4 opacity-60">Загружаем…</div>
          )}
          {!loading && threads.length === 0 && (
            <div className="p-5 text-center">
              <Icon name="MessageSquare" size={24} fallback="MessageCircle" />
              <div className="h-label mt-2 opacity-60">Переписок пока нет</div>
              <div className="h-mono-cap normal-case text-[var(--hero-muted)] mt-2 leading-relaxed">
                Откройте карточку охотника и напишите первым — диалог появится здесь
              </div>
            </div>
          )}
          {threads.map((t) => {
            const on = active?.guestId === t.guestId;
            return (
              <button
                key={t.guestId}
                onClick={() => setActive(t)}
                className="w-full text-left px-4 py-3 border-b border-[#e2e2df]"
                style={{ background: on ? 'var(--hero-surface)' : '#fff' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[0.8em] font-medium truncate">{t.name}</span>
                  {t.unread > 0 && (
                    <span
                      className="text-[0.62em] px-1.5 py-0.5 shrink-0"
                      style={{ background: '#e53935', color: '#fff' }}
                    >
                      {t.unread}
                    </span>
                  )}
                </div>
                <div className="text-[0.68em] text-[var(--hero-muted)] truncate mt-1">
                  {t.lastMine ? 'Вы: ' : ''}
                  {t.lastBody}
                </div>
                <div className="text-[0.6em] text-[#9a9a95] mt-1">
                  {fmtWhen(t.lastAt)}
                  {t.clubMember && ' · член клуба'}
                </div>
              </button>
            );
          })}
        </div>

        <div>
          {active ? (
            <>
              <button
                className="h-cta-ghost mb-2 lg:hidden"
                onClick={() => setActive(null)}
              >
                <Icon name="ArrowLeft" size={14} /> К списку переписок
              </button>
              <ChatPanel guestId={active.guestId} title={active.name} height={520} />
            </>
          ) : (
            <div
              className="border border-[#e2e2df] hidden lg:flex flex-col items-center justify-center text-center px-6"
              style={{ height: 520 }}
            >
              <Icon name="MessageSquare" size={30} fallback="MessageCircle" />
              <div className="h-label mt-3 opacity-70">Выберите охотника слева</div>
              <div className="h-mono-cap normal-case text-[var(--hero-muted)] mt-2 max-w-[380px] leading-relaxed">
                Здесь собраны все личные переписки. Красная цифра — сколько сообщений
                охотник прислал, а вы ещё не прочли.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesTab;