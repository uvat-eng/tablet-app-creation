import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import PasswordCard from '@/components/app/PasswordCard';
import StoreAssets from '@/components/app/StoreAssets';
import { useAuth } from '@/context/AuthContext';
import { ROLES, REVIEW_ACCOUNTS } from '@/lib/permissions';
import { APK_URL, APP_VERSION } from '@/lib/appVersion';
import { isIOS } from '@/lib/platform';


const Account = () => {
  const { user, signOut } = useAuth();

  const rows = [
    { label: 'Имя', value: String(user?.name || '—') },
    { label: 'Логин', value: String(user?.login || '—') },
    { label: 'Должность', value: String(user?.title || ROLES[String(user?.role)] || '—') },
    { label: 'Роль в системе', value: ROLES[String(user?.role)] || String(user?.role || '—') },
  ];

  return (
    <Layout
      index="Профиль"
      title="Мой профиль"
      lede="Ваш пароль, учётная запись и обновление приложения."
    >
      <div className="h-head text-[22px] mb-3">Безопасность</div>
      <PasswordCard />

      <div className="h-head text-[22px] mt-10 mb-3">Учётная запись</div>
      <div className="border border-[#e2e2df]">
        {rows.map((r, i) => (
          <div
            key={r.label}
            className="flex flex-wrap gap-2 justify-between px-4 py-3"
            style={{ borderTop: i ? '1px solid #e2e2df' : 'none' }}
          >
            <span className="h-label">{r.label}</span>
            <span className="text-[0.75em]">{r.value}</span>
          </div>
        ))}
      </div>

      <button className="h-cta-ghost mt-4" onClick={signOut}>
        <Icon name="LogOut" size={14} /> Выйти из системы
      </button>

      <div className="h-head text-[22px] mt-10 mb-3">Приложение</div>
      {isIOS() ? (
        <p className="h-mono-cap text-center">
          Обновления приходят через App Store
        </p>
      ) : (
        <>
          <a
            href={APK_URL}
            className="flex items-center justify-center gap-2 w-full bg-[#1f1f1d] text-white px-4 py-4 text-[0.85em] tracking-wide"
          >
            <Icon name="Download" size={18} />
            Скачать обновление
          </a>
          <p className="h-mono-cap mt-3 text-center">
            Откройте файл после загрузки и подтвердите установку — данные сохранятся
          </p>
        </>
      )}
      <p className="h-mono-cap mt-1 text-center opacity-60">Версия {APP_VERSION}</p>

      {user?.role === 'owner' && !isIOS() && (
        <>
          <div className="h-head text-[22px] mt-10 mb-3">Материалы для магазина</div>
          <p className="h-label mb-3 leading-relaxed">
            Иконки и баннер для карточки приложения.
          </p>
          <StoreAssets />

          <div className="h-head text-[22px] mt-10 mb-3">Доступ для проверки магазина</div>
          <p className="h-label mb-3 leading-relaxed">
            Впишите эти данные в поле «Комментарий для модератора» при подаче
            приложения — иначе проверяющий не сможет войти дальше экрана логина.
            Для каждого магазина свой доступ, оба работают с одной базой.
          </p>
          {REVIEW_ACCOUNTS.map((acc) => (
            <div key={acc.store} className="mb-4">
              <div className="h-label mb-2">{acc.store}</div>
              <div className="border border-[#e2e2df]">
                {[
                  { label: 'Логин', value: acc.login },
                  { label: 'Пароль', value: acc.pass },
                  { label: 'Тип входа', value: 'Сотрудник хозяйства' },
                ].map((r, i) => (
                  <div
                    key={r.label}
                    className="flex flex-wrap gap-2 justify-between px-4 py-3"
                    style={{ borderTop: i ? '1px solid #e2e2df' : 'none' }}
                  >
                    <span className="h-label">{r.label}</span>
                    <span className="text-[0.78em]">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <p className="h-label mt-3 leading-relaxed">
            Доступ ограничен: карта угодий, локации, трофейный зал и отзывы. Личные
            данные охотников, финансы и документы закрыты на сервере — даже в обход
            приложения.
          </p>
        </>
      )}

      <div className="mt-8 border border-[#e2e2df] px-4 py-3 flex gap-3">
        <Icon name="Info" size={16} className="shrink-0 mt-[2px]" />
        <p className="text-[0.78em] leading-relaxed">
          Забыли пароль — обратитесь к владельцу хозяйства, он выдаст новый.
          Права доступа к разделам тоже настраивает владелец.
        </p>
      </div>
    </Layout>
  );
};

export default Account;