import { useCallback, useEffect, useRef, useState } from 'react';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import NotifyPrompt from '@/components/app/NotifyPrompt';
import BackgroundToggle from '@/components/app/BackgroundToggle';
import {
  ClubMessage,
  loadClubChat,
  sendClubMessage,
  dayLabel,
  timeLabel,
  authorColor,
} from '@/lib/clubChatApi';
import MessageActions from '@/components/app/MessageActions';
import { toast } from 'sonner';
import { outboxFor, onOutbox, flushOutbox, restoreOutbox, OutboxItem } from '@/lib/chatOutbox';

const POLL_MS = 8000;

const ClubChat = () => {
  const [items, setItems] = useState<ClubMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [firstUnread, setFirstUnread] = useState(0);
  const [pending, setPending] = useState<OutboxItem[]>(() => outboxFor('club'));

  useEffect(() => {
    const sync = () => setPending(outboxFor('club'));
    restoreOutbox().then(sync);
    return onOutbox(sync);
  }, []);

  const boxRef = useRef<HTMLDivElement>(null);
  const countRef = useRef(0);
  const stickRef = useRef(true);

  const atBottom = () => {
    const el = boxRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 90;
  };

  const scroll = useCallback((smooth = false) => {
    const el = boxRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await loadClubChat();
      stickRef.current = atBottom();
      if (countRef.current === 0 && data.lastReadId) {
        const idx = data.messages.findIndex((m) => m.id > data.lastReadId && !m.me);
        setFirstUnread(idx >= 0 ? data.messages[idx].id : 0);
      }
      setItems(data.messages);
      if (data.messages.length !== countRef.current) {
        const first = countRef.current === 0;
        countRef.current = data.messages.length;
        if (first || stickRef.current) setTimeout(() => scroll(!first), 50);
      }
      setDenied(false);
    } catch (e) {
      if (String(e).includes('403')) setDenied(true);
    } finally {
      setLoading(false);
    }
  }, [scroll]);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  const submit = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      const data = await sendClubMessage(body);
      if (data) {
        setItems(data.messages);
        countRef.current = data.messages.length;
        flushOutbox().then((n) => {
          if (n) load();
        });
      } else {
        toast('Нет связи — сообщение уйдёт само, когда появится сеть');
      }
      setText('');
      setFirstUnread(0);
      setTimeout(() => scroll(true), 50);
    } catch {
      toast.error('Сообщение не ушло — проверьте связь');
    } finally {
      setBusy(false);
    }
  };

  if (denied) {
    return (
      <Layout index="Клуб / Чат" title="Чат клуба" lede="Доступ ограничен">
        <div className="border border-[#e2e2df] p-8 text-center">
          <Icon name="Lock" size={26} fallback="CircleAlert" />
          <div className="h-label mt-3">Чат только для членов закрытого клуба</div>
        </div>
      </Layout>
    );
  }

  let lastDay = '';

  return (
    <Layout
      index="Клуб / Чат"
      title="Чат клуба"
      lede="Общий разговор членов клуба и руководства хозяйства."
    >
      <NotifyPrompt />
      <BackgroundToggle />

      <div
        className="border border-[#e2e2df] flex flex-col"
        style={{ height: 'min(72vh, 620px)' }}
      >
        <div ref={boxRef} className="flex-1 overflow-y-auto p-4 bg-[#f7f7f5]">
          {loading && items.length === 0 && (
            <div className="h-label text-center py-10 opacity-60">Загружаем чат…</div>
          )}
          {!loading && items.length === 0 && pending.length === 0 && (
            <div className="text-center py-14">
              <Icon name="MessagesSquare" size={28} fallback="MessageCircle" />
              <div className="h-label mt-3 opacity-70">Сообщений пока нет</div>
              <div className="h-mono-cap normal-case text-[var(--hero-muted)] mt-2">
                Напишите первым — увидят все члены клуба
              </div>
            </div>
          )}

          {items.map((m) => {
            const day = dayLabel(m.createdAt);
            const showDay = day !== lastDay;
            lastDay = day;
            const isNew = firstUnread > 0 && m.id === firstUnread;
            return (
              <div key={m.id}>
                {showDay && (
                  <div className="flex justify-center my-3">
                    <span
                      className="h-label px-3 py-1"
                      style={{ background: '#e6e6e2', borderRadius: 12 }}
                    >
                      {day}
                    </span>
                  </div>
                )}
                {isNew && (
                  <div className="flex items-center gap-2 my-3">
                    <span className="flex-1 h-px" style={{ background: '#c0392b' }} />
                    <span className="h-label" style={{ color: '#c0392b' }}>
                      новые сообщения
                    </span>
                    <span className="flex-1 h-px" style={{ background: '#c0392b' }} />
                  </div>
                )}
                <div
                  className="mb-2 flex items-start gap-1"
                  style={{ justifyContent: m.me ? 'flex-end' : 'flex-start' }}
                >
                  {m.me && (
                    <div className="pt-2">
                      <MessageActions
                        kind="club"
                        messageId={m.id}
                        authorId={m.staffId}
                        authorName={m.author}
                        mine
                        onDone={load}
                      />
                    </div>
                  )}
                  <div
                    className="px-3 py-2"
                    style={{
                      maxWidth: '80%',
                      background: m.me ? '#dcf8c6' : '#fff',
                      border: '1px solid #e2e2df',
                      borderRadius: 8,
                    }}
                  >
                    {!m.me && (
                      <div
                        className="text-[0.66em] font-semibold mb-1"
                        style={{ color: authorColor(m.staffId) }}
                      >
                        {m.author}
                      </div>
                    )}
                    <div className="text-[0.84em] whitespace-pre-wrap break-words">
                      {m.body}
                    </div>
                    <div className="text-[0.6em] opacity-50 mt-1 text-right">
                      {timeLabel(m.createdAt)}
                    </div>
                  </div>
                  {!m.me && (
                    <div className="pt-2">
                      <MessageActions
                        kind="club"
                        messageId={m.id}
                        authorId={m.staffId}
                        authorName={m.author || 'участник'}
                        mine={false}
                        onDone={load}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {pending.map((m) => (
            <div key={m.id} className="mb-2 flex justify-end">
              <div
                className="px-3 py-2"
                style={{
                  maxWidth: '80%',
                  background: '#dcf8c6',
                  border: '1px dashed #9bb98a',
                  borderRadius: 8,
                  opacity: 0.75,
                }}
              >
                <div className="text-[0.84em] whitespace-pre-wrap break-words">{m.body}</div>
                <div className="text-[0.6em] opacity-60 mt-1 text-right flex items-center justify-end gap-1">
                  <Icon name="Clock" size={11} /> ждёт связи
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-[#e2e2df] p-3 flex gap-2 items-end bg-white">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                submit();
              }
            }}
            rows={2}
            placeholder="Написать в чат клуба…"
            className="flex-1 border border-[#e2e2df] px-3 py-2 text-[0.84em] resize-none bg-white"
          />
          <button
            className="h-cta shrink-0"
            disabled={busy || !text.trim()}
            onClick={submit}
            style={{ opacity: busy || !text.trim() ? 0.5 : 1 }}
          >
            <Icon name="Send" size={15} fallback="ArrowRight" />
            {busy ? 'Шлём…' : 'Отправить'}
          </button>
        </div>
      </div>

      <div className="h-label mt-3 opacity-60">
        Сообщения видят все члены клуба и руководство хозяйства
      </div>
      <div className="border border-[#e2e2df] px-4 py-3 mt-3 flex gap-3">
        <Icon name="ShieldCheck" size={16} fallback="Info" className="shrink-0 mt-[2px]" />
        <p className="text-[0.76em] leading-relaxed">
          Оскорбления, реклама и нецензурная лексика запрещены. Нажмите три точки
          рядом с сообщением, чтобы пожаловаться или скрыть все сообщения участника.
          Руководство разбирает жалобы в течение суток.
        </p>
      </div>
    </Layout>
  );
};

export default ClubChat;