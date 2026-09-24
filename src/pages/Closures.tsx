import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import {
  AccountClosure,
  loadClosures,
  purgeAccountNow,
  restoreAccount,
} from '@/lib/closuresApi';
import { toast } from 'sonner';

const STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Ждёт стирания', color: '#c0392b' },
  restored: { label: 'Запись восстановлена', color: '#0a7d54' },
  purged: { label: 'Данные стёрты', color: 'var(--hero-muted)' },
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

const daysWord = (n: number) => {
  if (n === 0) return 'сегодня';
  const last = n % 10;
  const two = n % 100;
  if (two >= 11 && two <= 14) return `через ${n} дней`;
  if (last === 1) return `через ${n} день`;
  if (last >= 2 && last <= 4) return `через ${n} дня`;
  return `через ${n} дней`;
};

const Closures = () => {
  const [rows, setRows] = useState<AccountClosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(0);
  const [denied, setDenied] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await loadClosures());
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

  const pending = useMemo(() => rows.filter((r) => r.status === 'pending'), [rows]);

  const restore = async (r: AccountClosure) => {
    setBusy(r.id);
    try {
      await restoreAccount(r.id);
      toast.success(`${r.name || 'Охотник'} снова может войти`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не получилось');
    } finally {
      setBusy(0);
    }
  };

  const purge = async (r: AccountClosure) => {
    setBusy(r.id);
    try {
      await purgeAccountNow(r.id);
      toast.success('Данные стёрты');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не получилось');
    } finally {
      setBusy(0);
    }
  };

  if (denied) {
    return (
      <Layout index="Доступ / Удаление" title="Заявки на удаление" lede="Доступ ограничен">
        <div className="border border-[#e2e2df] p-8 text-center">
          <Icon name="Lock" size={26} fallback="CircleAlert" />
          <div className="h-label mt-3">
            Раздел доступен только Ускову А.Н. и Ускову Н.А.
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      index="Доступ / Удаление"
      title="Заявки на удаление"
      lede="Охотник закрыл доступ сам. Данные стираются через 7 дней — до этого запись можно вернуть."
    >
      <div className="border border-[#e2e2df] px-4 py-4 mb-4 flex flex-wrap gap-6">
        <div>
          <div className="h-label">Ждут стирания</div>
          <div className="h-head text-[26px] mt-1">{pending.length}</div>
        </div>
        <div>
          <div className="h-label">Всего заявок</div>
          <div className="h-head text-[26px] mt-1">{rows.length}</div>
        </div>
      </div>

      {loading && (
        <div className="h-label text-center py-10 opacity-60">Загружаем заявки…</div>
      )}

      {!loading && rows.length === 0 && (
        <div className="border border-[#e2e2df] p-10 text-center">
          <Icon name="UserCheck" size={28} fallback="Check" />
          <div className="h-label mt-3">Заявок нет</div>
          <div className="h-mono-cap normal-case text-[var(--hero-muted)] mt-2">
            Никто из охотников не удалял свою запись
          </div>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((r) => {
          const st = STATUS[r.status] || STATUS.pending;
          const active = r.status === 'pending';
          return (
            <div key={r.id} className="border border-[#e2e2df]">
              <div
                className="px-4 py-3 flex flex-wrap gap-2 items-center justify-between"
                style={{ background: active ? 'var(--hero-surface)' : '#fff' }}
              >
                <div>
                  <div className="h-head text-[17px]">{r.name || 'Без имени'}</div>
                  <div className="h-mono-cap mt-1 text-[var(--hero-muted)]">
                    логин {r.login || '—'}
                  </div>
                </div>
                <span className="h-mono-cap" style={{ color: st.color }}>
                  {st.label}
                </span>
              </div>

              <div className="px-4 py-3 border-t border-[#e2e2df]">
                {active && (
                  <div className="flex items-center gap-2 mb-3">
                    <Icon name="Clock" size={15} fallback="Timer" className="shrink-0" />
                    <span className="text-[0.82em]">
                      Данные будут стёрты {daysWord(r.daysLeft)} — {fmt(r.purgeAfter)}
                    </span>
                  </div>
                )}

                {r.reason && (
                  <p className="text-[0.78em] leading-relaxed mb-3">
                    <span className="h-label">Причина ухода: </span>
                    {r.reason}
                  </p>
                )}

                <p className="h-mono-cap text-[var(--hero-muted)]">
                  Заявка подана {fmt(r.closedAt)}
                </p>

                {r.restoredBy && (
                  <p className="h-mono-cap mt-1 text-[var(--hero-muted)]">
                    Восстановил {r.restoredBy}
                  </p>
                )}

                {r.purgedAt && (
                  <p className="h-mono-cap mt-1 text-[var(--hero-muted)]">
                    Стёрто {fmt(r.purgedAt)}
                  </p>
                )}

                {active && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      className="h-cta"
                      disabled={busy === r.id}
                      onClick={() => restore(r)}
                    >
                      <Icon name="RotateCcw" size={14} fallback="Undo" />
                      Вернуть доступ
                    </button>
                    <button
                      className="flex items-center gap-2 px-4 py-3 text-[0.8em] tracking-wide text-white"
                      style={{ background: busy === r.id ? '#c9a09b' : '#a32b20' }}
                      disabled={busy === r.id}
                      onClick={() => purge(r)}
                    >
                      <Icon name="Trash2" size={15} />
                      Стереть сейчас
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 border border-[#e2e2df] px-4 py-3 flex gap-3">
        <Icon name="Info" size={16} className="shrink-0 mt-[2px]" />
        <p className="text-[0.78em] leading-relaxed">
          Путёвки, акты, записи о добыче и взносах сохраняются в любом случае — стираются
          только личные данные охотника: паспорт, телефон, охотничий билет и разрешение на
          оружие.
        </p>
      </div>
    </Layout>
  );
};

export default Closures;
