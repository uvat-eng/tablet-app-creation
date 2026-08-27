import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ROLES } from '@/lib/permissions';

const Login = () => {
  const { signIn } = useAuth();
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
      await signIn(login, password, role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white';

  return (
    <div className="h-shell min-h-screen flex items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-[380px]">
        <div className="flex items-center gap-3 mb-8">
          <svg viewBox="0 0 108 26" className="w-[90px] h-[22px]" aria-label="Охотбаза">
            <g fill="currentColor">
              <rect x="0" y="0" width="9" height="26" />
              <rect x="12" y="6" width="9" height="14" />
              <rect x="24" y="0" width="9" height="26" />
              <rect x="36" y="10" width="9" height="6" />
              <rect x="48" y="0" width="9" height="26" />
              <rect x="60" y="6" width="9" height="20" />
              <rect x="72" y="0" width="9" height="14" />
              <rect x="84" y="4" width="9" height="18" />
              <rect x="96" y="0" width="9" height="26" />
            </g>
          </svg>
          <span
            className="text-[0.7em] uppercase tracking-[0.14em] font-bold"
            style={{ fontFamily: 'var(--hero-font-head)' }}
          >
            Охотбаза
          </span>
        </div>

        <h1 className="h-head text-[34px]">Вход в базу</h1>
        <p className="h-mono-cap mt-3">Учётная система хозяйства. Доступ только для сотрудников.</p>

        <label className="block mt-7">
          <span className="h-label block mb-1">Логин</span>
          <input
            className={input}
            value={login}
            autoFocus
            onChange={(e) => setLogin(e.target.value)}
          />
        </label>

        <div className="mt-4">
          <span className="h-label block mb-2">Роль</span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ROLES).map(([value, label]) => (
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