import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ROLES } from '@/lib/permissions';
import Brand from '@/components/app/Brand';

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
        <div className="mb-8">
          <Brand size="md" />
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