import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import { ContentReport, loadReports, resolveReport } from '@/lib/moderationApi';
import { toast } from 'sonner';

const KIND_LABEL: Record<string, string> = {
  club: 'Чат клуба',
  chat: 'Переписка с хозяйством',
};

const STATUS_LABEL: Record<string, string> = {
  new: 'Ждёт решения',
  removed: 'Сообщение удалено',
  kept: 'Нарушений нет',
};

const fmt = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso.endsWith('Z') ? iso : `${iso}Z`);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const Reports = () => {
  const [rows, setRows] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(0);
  const [denied, setDenied] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await loadReports());
      setDenied(false);
    } catch {
      setDenied(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const fresh = useMemo(() => rows.filter((r) => r.status === 'new'), [rows]);

  const decide = async (id: number, verdict: 'removed' | 'kept') => {
    setBusy(id);
    try {
      await resolveReport(id, verdict);
      toast.success(
        verdict === 'removed' ? 'Сообщение скрыто у всех' : 'Жалоба отклонена',
      );
      load();
    } catch {
      toast.error('Не получилось — проверьте связь');
    } finally {
      setBusy(0);
    }
  };

  if (denied) {
    return (
      <Layout index="Клуб / Жалобы" title="Жалобы" lede="Доступ ограничен">
        <div className="border border-[#e2e2df] p-8 text-center">
          <Icon name="Lock" size={26} fallback="CircleAlert" />
          <div className="h-label mt-3">Раздел доступен руководству хозяйства</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      index="Клуб / Жалобы"
      title="Жалобы на сообщения"
      lede="Разбор обращений участников. Решение нужно принять в течение суток."
    >
      <div className="border border-[#e2e2df] px-4 py-4 mb-4 flex flex-wrap gap-4">
        <div>
          <div className="h-label">Ждут решения</div>
          <div className="h-head text-[26px] mt-1">{fresh.length}</div>
        </div>
        <div>
          <div className="h-label">Всего обращений</div>
          <div className="h-head text-[26px] mt-1">{rows.length}</div>
        </div>
      </div>

      {loading && (
        <div className="h-label text-center py-10 opacity-60">Загружаем жалобы…</div>
      )}

      {!loading && rows.length === 0 && (
        <div className="border border-[#e2e2df] p-10 text-center">
          <Icon name="ShieldCheck" size={28} fallback="Check" />
          <div className="h-label mt-3">Жалоб нет</div>
          <div className="h-mono-cap normal-case text-[var(--hero-muted)] mt-2">
            Участники пока ни на что не жаловались
          </div>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((r) => {
          const isNew = r.status === 'new';
          return (
            <div key={r.id} className="border border-[#e2e2df]">
              <div
                className="px-4 py-3 flex flex-wrap gap-2 items-center justify-between"
                style={{ background: isNew ? 'var(--hero-surface)' : '#fff' }}
              >
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="h-label">{r.reason}</span>
                  <span className="h-mono-cap text-[var(--hero-muted)]">
                    {KIND_LABEL[r.kind] || r.kind}
                  </span>
                </div>
                <span
                  className="h-mono-cap"
                  style={{ color: isNew ? '#c0392b' : 'var(--hero-muted)' }}
                >
                  {STATUS_LABEL[r.status] || r.status}
                </span>
              </div>

              <div className="px-4 py-3 border-t border-[#e2e2df]">
                <div className="h-label mb-1">Автор — {r.author || 'неизвестен'}</div>
                <div
                  className="text-[0.82em] leading-relaxed whitespace-pre-wrap break-words px-3 py-2"
                  style={{ background: '#f7f7f5', border: '1px solid #e2e2df' }}
                >
                  {r.body || '— текст не сохранён —'}
                </div>

                {r.comment && (
                  <p className="text-[0.78em] leading-relaxed mt-3">
                    <span className="h-label">Пояснение: </span>
                    {r.comment}
                  </p>
                )}

                <p className="h-mono-cap mt-3 text-[var(--hero-muted)]">
                  Пожаловался {r.reporter || 'участник'} · {fmt(r.createdAt)}
                </p>

                {isNew ? (
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      className="flex items-center gap-2 px-4 py-3 text-[0.8em] tracking-wide text-white"
                      style={{ background: busy === r.id ? '#c9a09b' : '#a32b20' }}
                      disabled={busy === r.id}
                      onClick={() => decide(r.id, 'removed')}
                    >
                      <Icon name="Trash2" size={15} />
                      Удалить сообщение
                    </button>
                    <button
                      className="h-cta-ghost"
                      disabled={busy === r.id}
                      onClick={() => decide(r.id, 'kept')}
                    >
                      <Icon name="Check" size={14} /> Нарушений нет
                    </button>
                  </div>
                ) : (
                  r.resolvedBy && (
                    <p className="h-mono-cap mt-3 text-[var(--hero-muted)]">
                      Решение принял {r.resolvedBy}
                    </p>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
};

export default Reports;
