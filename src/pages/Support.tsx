import { Link } from 'react-router-dom';
import Brand from '@/components/app/Brand';
import Icon from '@/components/ui/icon';
import { PRIVACY_OPERATOR } from '@/lib/privacyText';

const PHONE = '+7 919 936-43-00';
const PHONE_RAW = '+79199364300';
const EMAIL = 'kid.tmn.gun@gmail.com';
const ADDRESS =
  'Тюменская область, Аромашевский район, д. Малоскаредное, ул. Советская, д. 23';

const CONTACTS = [
  {
    icon: 'Phone',
    label: 'Телефон',
    value: PHONE,
    href: `tel:${PHONE_RAW}`,
    hint: 'ежедневно с 9:00 до 21:00 (МСК+2)',
  },
  {
    icon: 'Mail',
    label: 'Электронная почта',
    value: EMAIL,
    href: `mailto:${EMAIL}`,
    hint: 'отвечаем в течение одного рабочего дня',
  },
  {
    icon: 'MessageCircle',
    label: 'WhatsApp',
    value: PHONE,
    href: `https://wa.me/${PHONE_RAW.replace('+', '')}`,
    hint: 'написать в мессенджере',
  },
  {
    icon: 'Globe',
    label: 'Сайт хозяйства',
    value: 'kid-hunter.com',
    href: 'https://kid-hunter.com',
    hint: 'цены, размещение, егеря',
  },
];

const FAQ = [
  {
    q: 'Как получить доступ в приложение?',
    a:
      'Приложение предназначено для охотников хозяйства «Малышенское». ' +
      'Зарегистрируйтесь на экране входа или обратитесь к администратору ' +
      'по телефону выше — вам выдадут логин и пароль.',
  },
  {
    q: 'Забыл пароль — что делать?',
    a:
      'Позвоните или напишите администратору: пароль сбросят и выдадут новый. ' +
      'Сменить его можно в разделе «Настройки» вашего кабинета.',
  },
  {
    q: 'Как подать заявку на охоту?',
    a:
      'Откройте раздел «Мои охоты» и нажмите «Новая заявка». Укажите даты, ' +
      'количество человек и желаемую дичь — приложение покажет примерную ' +
      'стоимость до подачи. Хозяйство рассмотрит заявку и свяжется с вами.',
  },
  {
    q: 'Приложение не работает без интернета?',
    a:
      'Основные разделы работают: данные сохраняются на устройстве и ' +
      'отправляются на сервер, когда связь появится. Карту угодий можно ' +
      'скачать заранее в разделе «Карта хозяйства».',
  },
  {
    q: 'Как удалить свою учётную запись и данные?',
    a:
      'Напишите на электронную почту, указанную выше, с пометкой ' +
      '«Удаление учётной записи». Мы удалим профиль и связанные с ним ' +
      'данные в течение 7 рабочих дней.',
  },
];

const Support = () => (
  <div className="h-shell min-h-screen px-6 py-10">
    <div className="w-full max-w-[720px] mx-auto">
      <div className="mb-8">
        <Brand size="md" />
      </div>

      <Link to="/" className="h-label underline mb-5 inline-flex items-center gap-1">
        <Icon name="ChevronLeft" size={13} /> назад
      </Link>

      <h1 className="h-head text-[32px]">Поддержка</h1>
      <p className="h-mono-cap mt-3">
        Приложение «Малышенское» · вопросы по работе, доступу и заявкам
      </p>

      <div className="mt-8 grid gap-px" style={{ background: '#e2e2df', border: '1px solid #e2e2df' }}>
        {CONTACTS.map((c) => (
          <a
            key={c.label}
            href={c.href}
            target={c.href.startsWith('http') ? '_blank' : undefined}
            rel="noreferrer"
            className="bg-white p-5 block hover:bg-[var(--hero-surface)]"
          >
            <span className="h-label flex items-center gap-2">
              <Icon name={c.icon} size={14} /> {c.label}
            </span>
            <div className="h-head text-[19px] mt-2 break-all">{c.value}</div>
            <span className="h-mono-cap block mt-1 text-[var(--hero-muted)]">{c.hint}</span>
          </a>
        ))}
      </div>

      <div className="mt-6 border border-[#e2e2df] px-4 py-4">
        <span className="h-label flex items-center gap-2 mb-2">
          <Icon name="MapPin" size={14} /> Адрес хозяйства
        </span>
        <p className="text-[0.8em] leading-relaxed">{ADDRESS}</p>
      </div>

      <h2 className="h-head text-[22px] mt-12">Частые вопросы</h2>
      <div className="mt-5 space-y-6">
        {FAQ.map((f) => (
          <section key={f.q}>
            <h3 className="h-head text-[16px]">{f.q}</h3>
            <p className="mt-2 text-[0.82em] leading-relaxed">{f.a}</p>
          </section>
        ))}
      </div>

      <div className="mt-12 border border-[#e2e2df] px-4 py-4">
        <span className="h-label block mb-2">Сведения об организации</span>
        <p className="text-[0.8em] leading-relaxed">{PRIVACY_OPERATOR}</p>
      </div>

      <div className="mt-8 border-t border-[#e2e2df] pt-6 flex flex-wrap gap-5">
        <Link to="/privacy" className="h-label underline">
          Политика конфиденциальности
        </Link>
        <Link to="/download" className="h-label underline">
          Скачать приложение
        </Link>
      </div>
    </div>
  </div>
);

export default Support;
