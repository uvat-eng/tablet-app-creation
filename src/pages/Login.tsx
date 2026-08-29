import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ROLES } from '@/lib/permissions';
import Icon from '@/components/ui/icon';
import Brand from '@/components/app/Brand';

const STAFF_ROLES = Object.entries(ROLES).filter(([key]) => key !== 'hunter');

type Mode = '' | 'staff' | 'hunter' | 'signup';

const Login = () => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('');
  const [login, setLogin] = useState('');
  const [role, setRole] = useState('owner');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'signup') {
        await signUp({ name, phone, city, login, password });
      } else {
        await signIn(login, password, mode === 'hunter' ? 'hunter' : role);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setBusy(false);
    }
  };

  const pick = (next: Mode) => {
    setMode(next);
    setError('');
    setLogin('');
    setPassword('');
    setName('');
    setPhone('');
    setCity('');
  };

  const input = 'w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white';

  if (!mode) {
    return (
      <div className="h-shell min-h-screen flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-8">
            <Brand size="md" />
          </div>

          <h1 className="h-head text-[34px]">Вход</h1>
          <p className="h-mono-cap mt-3">Выберите, кто вы — откроем нужный раздел.</p>

          <button
            type="button"
            onClick={() => pick('hunter')}
            className="w-full border border-[#e2e2df] bg-white p-5 mt-7 text-left hover:bg-[var(--hero-surface)] transition-colors"
          >
            <span className="flex items-center gap-2">
              <Icon name="Target" size={16} fallback="Circle" />
              <span className="h-head text-[19px]">Охотник</span>
            </span>
            <span className="h-mono-cap block mt-2 text-[var(--hero-muted)]">
              Заявка на охоту, цены, карта, ваши трофеи
            </span>
          </button>

          <button
            type="button"
            onClick={() => pick('signup')}
            className="w-full border border-black bg-white p-5 mt-3 text-left hover:bg-[var(--hero-surface)] transition-colors"
          >
            <span className="flex items-center gap-2">
              <Icon name="UserPlus" size={16} fallback="Circle" />
              <span className="h-head text-[19px]">Я здесь впервые</span>
            </span>
            <span className="h-mono-cap block mt-2 text-[var(--hero-muted)]">
              Зарегистрироваться и подать заявку на охоту
            </span>
          </button>

          <button
            type="button"
            onClick={() => pick('staff')}
            className="w-full border border-[#e2e2df] bg-white p-5 mt-3 text-left hover:bg-[var(--hero-surface)] transition-colors"
          >
            <span className="flex items-center gap-2">
              <Icon name="Briefcase" size={16} fallback="Circle" />
              <span className="h-head text-[19px]">Сотрудник хозяйства</span>
            </span>
            <span className="h-mono-cap block mt-2 text-[var(--hero-muted)]">
              Брони, финансы, документы, полный учёт
            </span>
          </button>

          <p className="h-label mt-6 leading-relaxed">
            Член закрытого клуба входит здесь же — как охотник, логин выдаёт хозяйство.
          </p>
        </div>
      </div>
    );
  }

  const hunter = mode === 'hunter';
  const reg = mode === 'signup';

  return (
    <div className="h-shell min-h-screen flex items-center justify-center px-6 py-10">
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
          {reg ? 'Регистрация' : hunter ? 'Кабинет охотника' : 'Вход в базу'}
        </h1>
        <p className="h-mono-cap mt-3">
          {reg
            ? 'Пара минут — и можно подавать заявку на охоту.'
            : hunter
              ? 'Заявки на охоту, цены, карта и ваши документы.'
              : 'Учётная система хозяйства. Доступ только для сотрудников.'}
        </p>

        {reg && (
          <>
            <label className="block mt-7">
              <span className="h-label block mb-1">Фамилия Имя Отчество</span>
              <input
                className={input}
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="block mt-4">
              <span className="h-label block mb-1">Телефон</span>
              <input
                className={input}
                value={phone}
                placeholder="+7 …"
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <label className="block mt-4">
              <span className="h-label block mb-1">Город</span>
              <input className={input} value={city} onChange={(e) => setCity(e.target.value)} />
            </label>
          </>
        )}

        <label className="block mt-4">
          <span className="h-label block mb-1">Логин</span>
          <input
            className={input}
            value={login}
            autoFocus={!reg}
            placeholder={reg ? 'латиницей, например ivanov' : ''}
            onChange={(e) => setLogin(e.target.value)}
          />
        </label>

        {!hunter && !reg && (
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
            placeholder={reg ? 'не короче 5 символов' : ''}
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
          {busy ? 'Проверяем…' : reg ? 'Зарегистрироваться' : 'Войти'}
        </button>

        {hunter && (
          <button
            type="button"
            className="h-label underline mt-4 block mx-auto"
            onClick={() => pick('signup')}
          >
            Ещё нет доступа? Зарегистрироваться
          </button>
        )}
      </form>
    </div>
  );
};

export default Login;
