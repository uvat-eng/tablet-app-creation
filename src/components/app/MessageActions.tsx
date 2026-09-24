import { useState } from 'react';
import Icon from '@/components/ui/icon';
import {
  REPORT_REASONS,
  ReportKind,
  blockUser,
  deleteOwnMessage,
  reportMessage,
} from '@/lib/moderationApi';
import { toast } from 'sonner';

interface Props {
  kind: ReportKind;
  messageId: number;
  authorId: number;
  authorName: string;
  mine: boolean;
  onDone: () => void;
}

const MessageActions = ({
  kind,
  messageId,
  authorId,
  authorName,
  mine,
  onDone,
}: Props) => {
  const [mode, setMode] = useState<'closed' | 'menu' | 'report'>('closed');
  const [reason, setReason] = useState('abuse');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    setMode('closed');
    setComment('');
  };

  const send = async () => {
    setBusy(true);
    try {
      await reportMessage(kind, messageId, reason, comment);
      toast.success('Жалоба отправлена — хозяйство рассмотрит её в течение суток');
      close();
      onDone();
    } catch {
      toast.error('Жалоба не ушла — проверьте связь');
    } finally {
      setBusy(false);
    }
  };

  const block = async () => {
    setBusy(true);
    try {
      await blockUser(authorId);
      toast.success(`Сообщения ${authorName} скрыты`);
      close();
      onDone();
    } catch {
      toast.error('Не получилось — проверьте связь');
    } finally {
      setBusy(false);
    }
  };

  const removeMine = async () => {
    setBusy(true);
    try {
      await deleteOwnMessage(kind, messageId);
      toast.success('Сообщение удалено');
      close();
      onDone();
    } catch {
      toast.error('Не получилось — проверьте связь');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        className="opacity-40 hover:opacity-90 shrink-0"
        aria-label="Действия с сообщением"
        onClick={() => setMode('menu')}
      >
        <Icon name="EllipsisVertical" size={14} fallback="MoreVertical" />
      </button>

      {mode !== 'closed' && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(20,20,18,.45)' }}
          onClick={close}
        >
          <div
            className="bg-white w-full sm:max-w-[420px] border border-[#e2e2df]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-[#e2e2df] flex items-center justify-between">
              <span className="h-label">
                {mode === 'menu' ? 'Что сделать' : 'Пожаловаться'}
              </span>
              <button onClick={close} aria-label="Закрыть">
                <Icon name="X" size={16} />
              </button>
            </div>

            {mode === 'menu' ? (
              <div>
                {mine ? (
                  <button
                    className="w-full text-left px-4 py-4 flex items-center gap-3 text-[0.82em]"
                    disabled={busy}
                    onClick={removeMine}
                  >
                    <Icon name="Trash2" size={16} />
                    Удалить моё сообщение
                  </button>
                ) : (
                  <>
                    <button
                      className="w-full text-left px-4 py-4 flex items-center gap-3 text-[0.82em]"
                      onClick={() => setMode('report')}
                    >
                      <Icon name="Flag" size={16} fallback="TriangleAlert" />
                      Пожаловаться на сообщение
                    </button>
                    <button
                      className="w-full text-left px-4 py-4 flex items-center gap-3 text-[0.82em] border-t border-[#e2e2df]"
                      disabled={busy}
                      onClick={block}
                    >
                      <Icon name="UserMinus" size={16} fallback="Ban" />
                      Скрыть все сообщения — {authorName}
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="p-4">
                <div className="h-label mb-2">Причина</div>
                <div className="border border-[#e2e2df] mb-3">
                  {REPORT_REASONS.map((r, i) => (
                    <button
                      key={r.id}
                      className="w-full text-left px-3 py-3 flex items-center gap-3 text-[0.8em]"
                      style={{
                        borderTop: i ? '1px solid #e2e2df' : 'none',
                        background: reason === r.id ? 'var(--hero-surface)' : '#fff',
                      }}
                      onClick={() => setReason(r.id)}
                    >
                      <Icon
                        name={reason === r.id ? 'CircleDot' : 'Circle'}
                        size={15}
                        className="shrink-0"
                      />
                      {r.label}
                    </button>
                  ))}
                </div>

                <textarea
                  className="w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] resize-none bg-white mb-3"
                  rows={3}
                  placeholder="Что случилось — по желанию"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />

                <div className="flex flex-wrap gap-2">
                  <button className="h-cta" disabled={busy} onClick={send}>
                    {busy ? 'Отправляем…' : 'Отправить жалобу'}
                  </button>
                  <button className="h-cta-ghost" onClick={() => setMode('menu')}>
                    Назад
                  </button>
                </div>

                <p className="h-mono-cap mt-4 text-[var(--hero-muted)]">
                  Руководство хозяйства рассматривает жалобы в течение 24 часов
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default MessageActions;
