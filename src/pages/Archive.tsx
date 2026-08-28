import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '@/components/app/Layout';
import DataTable from '@/components/app/DataTable';
import LogFeed, { TABLE_LABEL } from '@/components/app/LogFeed';
import Icon from '@/components/ui/icon';
import { Row, LogEntry, listRows, listLog, listStaff, updateRow } from '@/lib/api';
import { toast } from 'sonner';

const TABS = [
  { table: 'bookings', label: 'Брони', title: 'guest_name' },
  { table: 'checks', label: 'Акты', title: 'guest_name' },
  { table: 'receipts', label: 'Чеки', title: 'number' },
  { table: 'expenses', label: 'Расходы на охоту', title: 'name' },
  { table: 'house_expenses', label: 'Расходы по объектам', title: 'name' },
  { table: 'office_expenses', label: 'Расходы офиса', title: 'name' },
  { table: 'transfers', label: 'Переводы', title: 'name' },
  { table: 'transport_expenses', label: 'Расходы транспорта', title: 'name' },
  { table: 'objects', label: 'Объекты', title: 'name' },
  { table: 'guests', label: 'Гости', title: 'name' },
  { table: 'guest_docs', label: 'Документы гостей', title: 'title' },
  { table: 'services', label: 'Услуги', title: 'name' },
  { table: 'trophies', label: 'Трофеи', title: 'species' },
  { table: 'club_bag', label: 'Добыча клуба', title: 'species' },
  { table: 'hunter_bag', label: 'Добыча охотников', title: 'species' },
  { table: 'biotech_works', label: 'Биотехния', title: 'hunter_name' },
  { table: 'locations', label: 'Локации', title: 'name' },
  { table: 'map_layers', label: 'Слои карты', title: 'name' },
  { table: 'reviews', label: 'Отзывы', title: 'author' },
];

const ACTIONS = [
  { key: '', label: 'Все действия' },
  { key: 'create', label: 'Создание' },
  { key: 'update', label: 'Изменения' },
  { key: 'archive', label: 'В архив' },
  { key: 'delete', label: 'Удаление' },
];

const Archive = () => {
  const [mode, setMode] = useState<'log' | 'hidden'>('log');

  const [log, setLog] = useState<LogEntry[]>([]);
  const [staff, setStaff] = useState<Row[]>([]);
  const [who, setWho] = useState('');
  const [what, setWhat] = useState('');
  const [act, setAct] = useState('');
  const [loadingLog, setLoadingLog] = useState(true);

  const [tab, setTab] = useState(TABS[0]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLog = useCallback(async () => {
    setLoadingLog(true);
    const items = await listLog({
      staffId: who ? Number(who) : undefined,
      table: what || undefined,
      action: act || undefined,
      limit: 400,
    });
    setLog(items);
    setLoadingLog(false);
  }, [who, what, act]);

  useEffect(() => {
    loadLog();
  }, [loadLog]);

  useEffect(() => {
    listStaff().then(setStaff);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const all = await listRows(tab.table, { archived: true });
    setRows(all.filter((r) => r.archived));
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    if (mode === 'hidden') load();
  }, [load, mode]);

  const restore = async (row: Row) => {
    try {
      await updateRow(tab.table, { id: row.id, archived: false });
      toast.success('Запись возвращена в работу');
      load();
      loadLog();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось вернуть');
    }
  };

  const stats = useMemo(() => {
    const byUser = new Map<string, number>();
    log.forEach((e) => byUser.set(e.staff_name, (byUser.get(e.staff_name) || 0) + 1));
    return [...byUser.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [log]);

  const tables = useMemo(() => {
    const set = new Set(log.map((e) => e.table_name));
    return [...set];
  }, [log]);

  return (
    <Layout
      index="Раздел / Корзина и журнал"
      title="Корзина и журнал"
      lede="Удалённые записи хранятся здесь и возвращаются в работу одной кнопкой. Рядом — журнал: кто, что и когда менял."
      action={
        <span className="flex gap-2">
          <button
            className={mode === 'log' ? 'h-cta' : 'h-cta-ghost'}
            onClick={() => setMode('log')}
          >
            Журнал действий
          </button>
          <button
            className={mode === 'hidden' ? 'h-cta' : 'h-cta-ghost'}
            onClick={() => setMode('hidden')}
          >
            Корзина
          </button>
        </span>
      }
    >
      {mode === 'log' ? (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="h-label mr-1">Сотрудник</span>
            <select
              value={who}
              onChange={(e) => setWho(e.target.value)}
              className="h-label px-2 py-1 border bg-white"
              style={{ borderColor: '#e2e2df' }}
            >
              <option value="">Все</option>
              {staff.map((s) => (
                <option key={String(s.id)} value={String(s.id)}>
                  {String(s.name)}
                </option>
              ))}
            </select>

            <span className="h-label ml-3 mr-1">Раздел</span>
            <select
              value={what}
              onChange={(e) => setWhat(e.target.value)}
              className="h-label px-2 py-1 border bg-white"
              style={{ borderColor: '#e2e2df' }}
            >
              <option value="">Все</option>
              {tables.map((t) => (
                <option key={t} value={t}>
                  {TABLE_LABEL[t] || t}
                </option>
              ))}
            </select>

            <span className="h-label ml-3 mr-1">Действие</span>
            {ACTIONS.map((a) => (
              <button
                key={a.key}
                onClick={() => setAct(a.key)}
                className="h-label px-2 py-1 border"
                style={{
                  borderColor: '#e2e2df',
                  background: act === a.key ? 'var(--hero-accent)' : '#fff',
                  color: act === a.key ? 'var(--hero-accent-contrast)' : 'inherit',
                }}
              >
                {a.label}
              </button>
            ))}

            <button className="h-cta-ghost ml-auto" onClick={loadLog}>
              <Icon name="RefreshCw" size={14} /> Обновить
            </button>
          </div>

          {stats.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-4 text-sm text-[#6d6d6d]">
              <span className="h-label">Записей всего: {log.length}</span>
              {stats.map(([n, c]) => (
                <span key={n}>
                  {n} — {c}
                </span>
              ))}
            </div>
          )}

          <LogFeed
            items={log}
            empty={loadingLog ? 'Загружаем журнал…' : 'Пока никаких действий не записано'}
          />
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-6">
            {TABS.map((t) => (
              <button
                key={t.table}
                className={tab.table === t.table ? 'h-cta' : 'h-cta-ghost'}
                onClick={() => setTab(t)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <DataTable
            columns={[
              {
                key: tab.title,
                label: 'Запись',
                render: (r) => (
                  <span>{String(r[tab.title] || r.name || r.guest_name || '—')}</span>
                ),
              },
              {
                key: '__date',
                label: 'Дата',
                width: '120px',
                render: (r) => (
                  <span>
                    {String(r.spent_on || r.date_from || r.taken_on || r.created_at || '').slice(
                      0,
                      10,
                    ) || '—'}
                  </span>
                ),
              },
              {
                key: '__sum',
                label: 'Сумма',
                width: '130px',
                render: (r) => {
                  const v = Number(r.total ?? r.amount ?? r.final_total ?? 0);
                  return <span>{v ? `${v.toLocaleString('ru-RU')} ₽` : '—'}</span>;
                },
              },
              {
                key: 'created_by_name',
                label: 'Кто внёс',
                width: '160px',
                render: (r) => <span>{String(r.created_by_name || '—')}</span>,
              },
              {
                key: 'restore',
                label: '',
                width: '130px',
                render: (r) => (
                  <button
                    className="h-label underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      restore(r);
                    }}
                  >
                    Вернуть
                  </button>
                ),
              },
            ]}
            rows={rows}
            empty={loading ? 'Загружаем…' : 'Архив пуст'}
          />
        </>
      )}
    </Layout>
  );
};

export default Archive;