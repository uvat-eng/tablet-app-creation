import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/icon';
import { ChatMessage, loadThread, sendMessage, fmtWhen } from '@/lib/chatApi';
import MessageActions from '@/components/app/MessageActions';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface Props {
  guestId?: number;
  title?: string;
  height?: number;
}

const POLL_MS = 20000;

const ChatPanel = ({ guestId, title, height = 420 }: Props) => {
  const { user } = useAuth();
  const [items, setItems] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const boxRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  const scroll = useCallback(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await loadThread(guestId);
      setItems(data.messages);
      if (data.messages.length !== lastCount.current) {
        lastCount.current = data.messages.length;
        setTimeout(scroll, 40);
      }
    } catch {
      /* нет связи — покажем что есть */
    } finally {
      setLoading(false);
    }
  }, [guestId, scroll]);

  useEffect(() => {
    setLoading(true);
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const submit = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      const data = await sendMessage(body, guestId);
      setItems(data.messages);
      setText('');
      setTimeout(scroll, 40);
    } catch {
      toast.error('Сообщение не ушло — проверьте связь');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-[#e2e2df] flex flex-col" style={{ height }}>
      {title && (
        <div className="px-4 py-3 border-b border-[#e2e2df] bg-[var(--hero-surface)]">
          <span className="h-label">{title}</span>
        </div>
      )}

      <div ref={boxRef} className="flex-1 overflow-y-auto p-4">
        {loading && items.length === 0 && (
          <div className="h-label text-center py-8 opacity-60">Загружаем переписку…</div>
        )}
        {!loading && items.length === 0 && (
          <div className="text-center py-10">
            <Icon name="MessageSquare" size={26} fallback="MessageCircle" />
            <div className="h-label mt-3 opacity-60">Сообщений пока нет</div>
            <div className="h-mono-cap normal-case text-[var(--hero-muted)] mt-1">
              Напишите первым — охотник увидит сообщение в своём кабинете
            </div>
          </div>
        )}

        {items.map((m) => {
          const mine = Number(user?.id || 0) === Number(m.staffId || 0);
          return (
          <div
            key={m.id}
            className="mb-3 flex items-start gap-1"
            style={{ justifyContent: m.fromStaff ? 'flex-end' : 'flex-start' }}
          >
            {m.fromStaff && (
              <div className="pt-2">
                <MessageActions
                  kind="chat"
                  messageId={m.id}
                  authorId={m.staffId}
                  authorName={m.author || 'собеседник'}
                  mine={mine}
                  onDone={load}
                />
              </div>
            )}
            <div
              className="px-3 py-2"
              style={{
                maxWidth: '78%',
                background: m.fromStaff ? 'var(--hero-accent)' : '#f2f2f0',
                color: m.fromStaff ? 'var(--hero-accent-contrast)' : 'inherit',
                border: '1px solid #e2e2df',
              }}
            >
              <div className="text-[0.62em] uppercase tracking-[0.08em] opacity-70 mb-1">
                {m.author}
              </div>
              <div className="text-[0.82em] whitespace-pre-wrap break-words">{m.body}</div>
              <div className="text-[0.6em] opacity-60 mt-1 text-right">
                {fmtWhen(m.createdAt)}
              </div>
            </div>
            {!m.fromStaff && (
              <div className="pt-2">
                <MessageActions
                  kind="chat"
                  messageId={m.id}
                  authorId={m.staffId}
                  authorName={m.author || 'собеседник'}
                  mine={mine}
                  onDone={load}
                />
              </div>
            )}
          </div>
          );
        })}
      </div>

      <div className="border-t border-[#e2e2df] p-3 flex gap-2 items-end">
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
          placeholder="Написать сообщение…"
          className="flex-1 border border-[#e2e2df] px-3 py-2 text-[0.82em] resize-none bg-white"
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
  );
};

export default ChatPanel;