import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Icon from '@/components/ui/icon';
import Brand from '@/components/app/Brand';

type Mode = '' | 'login' | 'signup';

const Login = () => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [show, setShow] = useState(false);
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
        await signIn(login.trim(), password);
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
          <p className="h-mono-cap mt-3">
            Один вход для всех — система сама откроет нужный раздел.
          </p>

          <button
            type="button"
            onClick={() => pick('login')}
            className="w-full border border-black bg-white p-5 mt-7 text-left hover:bg-[var(--hero-surface)] transition-colors"
          >
            <span className="flex items-center gap-2">
              <Icon name="LogIn" size={16} fallback="Circle" />
              <span className="h-head text-[19px]">У меня есть логин</span>
            </span>
            <span className="h-mono-cap block mt-2 text-[var(--hero-muted)]">
              Сотрудник, член клуба или охотник
            </span>
          </button>

          <button
            type="button"
            onClick={() => pick('signup')}
            className="w-full border border-[#e2e2df] bg-white p-5 mt-3 text-left hover:bg-[var(--hero-surface)] transition-colors"
          >
            <span className="flex items-center gap-2">
              <Icon name="UserPlus" size={16} fallback="Circle" />
              <span className="h-head text-[19px]">Я здесь впервые</span>
            </span>
            <span className="h-mono-cap block mt-2 text-[var(--hero-muted)]">
              Зарегистрироваться и подать заявку на охоту
            </span>
          </button>

          <p className="h-label mt-6 leading-relaxed">
            Логин для сотрудников и членов клуба выдаёт хозяйство.
          </p>
        </div>
      </div>
    );
  }

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

        <h1 className="h-head text-[34px]">{reg ? 'Регистрация' : 'Вход'}</h1>
        <p className="h-mono-cap mt-3">
          {reg
            ? 'Пара минут — и можно подавать заявку на охоту.'
            : 'Введите логин и пароль — откроем ваш раздел.'}
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
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder={reg ? 'латиницей, например ivanov' : ''}
            onChange={(e) => setLogin(e.target.value)}
          />
        </label>

        <label className="block mt-4">
          <span className="h-label block mb-1">Пароль</span>
          <input
            className={input}
            type={show ? 'text' : 'password'}
            value={password}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder={reg ? 'не короче 5 символов' : ''}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button
          type="button"
          className="h-label underline mt-2"
          onClick={() => setShow((v) => !v)}
        >
          {show ? 'Скрыть пароль' : 'Показать пароль'}
        </button>

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

        {!reg && (
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
