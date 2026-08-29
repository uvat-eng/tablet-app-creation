import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import { Row, listAccess, resetUserPassword, setUserActive } from '@/lib/api';
import { ROLES } from '@/lib/permissions';
import { toast } from 'sonner';

const GROUPS = [
  { key: 'staff', label: 'Хозяйство', hint: 'владельцы, администраторы, сотрудники' },
  { key: 'hunter', label: 'Охотники и клуб', hint: 'вход в личный кабинет' },
];

const suggest = () => {
  const words = ['Ohota', 'Taiga', 'Reka', 'Sosna', 'Zver', 'Trofey'];
  const w = words[Math.floor(Math.random() * words.length)];
  return `${w}${Math.floor(1000 + Math.random() * 9000)}`;
};

const Access = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState('staff');
  const [openId, setOpenId] = useState(0);
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listAccess());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось загрузить');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () =>
      rows.filter((r) =>
        group === 'hunter' ? r.role === 'hunter' : r.role !== 'hunter',
      ),
    [rows, group],
  );

  const notChanged = rows.filter((r) => r.active && !r.password_changed).length;

  const openReset = (id: number) => {
    setOpenId((cur) => (cur === id ? 0 : id));
    setPass(suggest());
  };

  const doReset = async (r: Row) => {
    const id = Number(r.id);
    if (pass.length < 5) {
      toast.error('Пароль — не короче 5 символов');
      return;
    }
    if (!confirm(`Задать «${r.name}» новый пароль? Старый перестанет работать.`)) return;
    setBusy(id);
    try {
      await resetUserPassword(id, pass);
      toast.success(`Готово. Передайте пароль лично: ${pass}`);
      setOpenId(0);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не получилось');
    } finally {
      setBusy(0);
    }
  };

  const toggle = async (r: Row) => {
    const id = Number(r.id);
    const on = !r.active;
    if (!on && !confirm(`Закрыть вход для «${r.name}»?`)) return;
    setBusy(id);
    try {
      await setUserActive(id, on);
      toast.success(on ? 'Вход открыт' : 'Вход закрыт');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не получилось');
    } finally {
      setBusy(0);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Скопировано');
    } catch {
      toast.error('Скопируйте вручную: ' + text);
    }
  };

  return (
    <Layout
      index="Раздел / Доступы"
      title="Логины и пароли"
      lede="Кто заходит в приложение. Здесь можно выдать новый пароль или закрыть вход."
    >
      <div
        className="grid gap-px mb-6"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          background: '#e2e2df',
          border: '1px solid #e2e2df',
        }}
      >
        <div className="bg-white p-4">
          <div className="h-label">Всего с доступом</div>
          <div className="h-head text-[22px] mt-1">
            {rows.filter((r) => r.active).length}
          </div>
        </div>
        <div className="bg-white p-4">
          <div className="h-label">Не сменили пароль</div>
          <div className="h-head text-[22px] mt-1">{notChanged}</div>
        </div>
        <div className="bg-white p-4">
          <div className="h-label">Вход закрыт</div>
          <div className="h-head text-[22px] mt-1">
            {rows.filter((r) => !r.active).length}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {GROUPS.map((g) => (
          <button
            key={g.key}
            className={group === g.key ? 'h-cta' : 'h-cta-ghost'}
            onClick={() => setGroup(g.key)}
          >
            {g.label}
          </button>
        ))}
      </div>

      {!visible.length && (
        <div className="border border-dashed border-[#c9c9c5] p-12 text-center">
          <Icon name="Users" size={26} />
          <div className="h-head text-[18px] mt-3">
            {loading ? 'Загружаем…' : 'Здесь пока никого'}
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {visible.map((r) => {
          const id = Number(r.id);
          const open = openId === id;
          return (
            <div
              key={id}
              className="border border-[#e2e2df] bg-white"
              style={{ opacity: r.active ? 1 : 0.6 }}
            >
              <div className="p-4 flex flex-wrap gap-3 justify-between items-start">
                <div className="min-w-[200px]">
                  <div className="h-head text-[17px]">{String(r.name)}</div>
                  <div className="h-label mt-1">
                    {String(r.title || ROLES[String(r.role)] || r.role)}
                    {r.club_member ? ' · член клуба' : ''}
                  </div>

                  <button
                    className="flex items-center gap-2 mt-3 border border-[#e2e2df] px-3 py-2"
                    onClick={() => copy(String(r.login))}
                  >
                    <Icon name="Copy" size={13} />
                    <span className="text-[0.76em]">{String(r.login)}</span>
                  </button>
                </div>

                <div className="text-right">
                  <div
                    className="h-label"
                    style={{ color: r.active ? '#007a43' : '#c0392b' }}
                  >
                    {r.active ? 'Вход открыт' : 'Вход закрыт'}
                  </div>
                  <div className="h-label mt-1">
                    {r.password_changed ? 'свой пароль' : 'пароль от хозяйства'}
                  </div>
                </div>
              </div>

              <div className="border-t border-[#e2e2df] px-4 py-3 flex flex-wrap gap-2">
                <button className="h-cta-ghost" onClick={() => openReset(id)}>
                  <Icon name="KeyRound" size={14} fallback="Lock" />
                  {open ? 'Свернуть' : 'Выдать новый пароль'}
                </button>
                <button
                  className="h-cta-ghost"
                  disabled={busy === id}
                  onClick={() => toggle(r)}
                >
                  <Icon name={r.active ? 'UserX' : 'UserCheck'} size={14} fallback="User" />
                  {r.active ? 'Закрыть вход' : 'Открыть вход'}
                </button>
              </div>

              {open && (
                <div className="border-t border-[#e2e2df] p-4">
                  <span className="h-label block mb-1">Новый пароль</span>
                  <div className="flex flex-wrap gap-2">
                    <input
                      className="flex-1 min-w-[160px] border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white"
                      value={pass}
                      onChange={(e) => setPass(e.target.value)}
                    />
                    <button className="h-cta-ghost" onClick={() => setPass(suggest())}>
                      <Icon name="RefreshCw" size={14} /> Другой
                    </button>
                    <button
                      className="h-cta"
                      disabled={busy === id}
                      onClick={() => doReset(r)}
                    >
                      {busy === id ? 'Сохраняем…' : 'Сохранить'}
                    </button>
                  </div>
                  <p className="h-mono-cap mt-3 text-[var(--hero-muted)]">
                    Запишите пароль до сохранения — потом его не подсмотреть.
                    Человек войдёт с ним и сменит на свой в настройках.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 border border-[#e2e2df] px-4 py-3 flex gap-3">
        <Icon name="Info" size={16} className="shrink-0 mt-[2px]" />
        <p className="text-[0.78em] leading-relaxed">
          Пароли хранятся зашифрованно — посмотреть чужой нельзя даже владельцу.
          Если человек забыл свой, выдайте новый здесь.
        </p>
      </div>
    </Layout>
  );
};

export default Access;
