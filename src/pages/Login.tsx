import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ROLES } from '@/lib/permissions';
import Icon from '@/components/ui/icon';
import Brand from '@/components/app/Brand';

const STAFF_ROLES = Object.entries(ROLES).filter(([key]) => key !== 'hunter');

const Login = () => {
  const { signIn } = useAuth();
  const [mode, setMode] = useState<'' | 'staff' | 'hunter'>('');
  const [login, setLogin] = useState('');
  const [role, setRole] = useState('owner');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signIn(login, password, mode === 'hunter' ? 'hunter' : role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setBusy(false);
    }
  };

  const pick = (next: 'staff' | 'hunter') => {
    setMode(next);
    setError('');
    setLogin('');
    setPassword('');
  };

  const input = 'w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white';

  if (!mode) {
    return (
      <div className="h-shell min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-[420px]">
          <div className="mb-8">
            <Brand size="md" />
          </div>

          <h1 className="h-head text-[34px]">Вход</h1>
          <p className="h-mono-cap mt-3">Выберите, кто вы — откроем нужный раздел.</p>

          <button
            type="button"
            onClick={() => pick('staff')}
            className="w-full border border-[#e2e2df] bg-white p-5 mt-7 text-left hover:bg-[var(--hero-surface)] transition-colors"
          >
            <span className="flex items-center gap-2">
              <Icon name="Briefcase" size={16} fallback="Circle" />
              <span className="h-head text-[19px]">Сотрудник хозяйства</span>
            </span>
            <span className="h-mono-cap block mt-2 text-[var(--hero-muted)]">
              Брони, финансы, документы, полный учёт
            </span>
          </button>

          <button
            type="button"
            onClick={() => pick('hunter')}
            className="w-full border border-[#e2e2df] bg-white p-5 mt-3 text-left hover:bg-[var(--hero-surface)] transition-colors"
          >
            <span className="flex items-center gap-2">
              <Icon name="ShieldCheck" size={16} fallback="Circle" />
              <span className="h-head text-[19px]">Член закрытого клуба</span>
            </span>
            <span className="h-mono-cap block mt-2 text-[var(--hero-muted)]">
              Карта, локации, своя биотехния, добыча и документы
            </span>
          </button>

          <p className="h-label mt-6 leading-relaxed">
            Нет доступа? Логин и пароль выдаёт хозяйство.
          </p>
        </div>
      </div>
    );
  }

  const hunter = mode === 'hunter';

  return (
    <div className="h-shell min-h-screen flex items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-[380px]">
        <div className="mb-8">
          <Brand size="md" />
        </div>

        <button
          type="button"
          className="h-label underline mb-4 flex items-center gap-1"
          onClick={() => setMode('')}
        >
          <Icon name="ChevronLeft" size={13} /> назад
        </button>

        <h1 className="h-head text-[34px]">
          {hunter ? 'Кабинет члена клуба' : 'Вход в базу'}
        </h1>
        <p className="h-mono-cap mt-3">
          {hunter
            ? 'Ваша биотехния, добыча, карта и документы.'
            : 'Учётная система хозяйства. Доступ только для сотрудников.'}
        </p>

        <label className="block mt-7">
          <span className="h-label block mb-1">Логин</span>
          <input
            className={input}
            value={login}
            autoFocus
            onChange={(e) => setLogin(e.target.value)}
          />
        </label>

        {!hunter && (
          <div className="mt-4">
            <span className="h-label block mb-2">Роль</span>
            <div className="flex flex-wrap gap-2">
              {STAFF_ROLES.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={role === value ? 'h-cta' : 'h-cta-ghost'}
                  onClick={() => setRole(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="block mt-4">
          <span className="h-label block mb-1">Пароль</span>
          <input
            className={input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && (
          <div
            className="mt-4 px-3 py-2 text-[0.7em]"
            style={{ background: 'var(--hero-x-mark)', color: '#fff' }}
          >
            {error}
          </div>
        )}

        <button className="h-cta mt-6 w-full text-center" disabled={busy}>
          {busy ? 'Проверяем…' : 'Войти'}
        </button>
      </form>
    </div>
  );
};

export default Login;
