import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import { Row, listRows } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import PasswordCard from '@/components/app/PasswordCard';
import { APK_URL, APP_VERSION } from '@/lib/appVersion';


const IOS_STEPS = [
  'Откройте сайт хозяйства в Safari.',
  'Нажмите «Поделиться» — квадрат со стрелкой вверх внизу экрана.',
  'Выберите «На экран «Домой»» и нажмите «Добавить».',
];

const MySettings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [me, setMe] = useState<Row | null>(null);
  const [tab, setTab] = useState<'android' | 'ios'>('android');

  const load = useCallback(async () => {
    const g = await listRows('guests');
    setMe(g[0] || null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const android = tab === 'android';

  const leave = async () => {
    await signOut();
    toast.success('Вы вышли из кабинета');
  };

  return (
    <Layout
      index="Кабинет / Настройки"
      title="Настройки"
      lede="Обновление приложения и ваша учётная запись."
    >
      <div className="h-head text-[22px] mb-3">Обновить приложение</div>
      <p className="h-label mb-4 leading-relaxed">
        Хозяйство иногда выпускает обновления — новые разделы и исправления.
        Скачайте свежую версию и установите поверх, данные сохранятся.
      </p>

      <div className="grid grid-cols-2 gap-px mb-4" style={{ background: '#e2e2df' }}>
        <button
          onClick={() => setTab('android')}
          className="flex items-center justify-center gap-2 px-3 py-3 text-[0.78em]"
          style={{
            background: android ? 'var(--hero-accent)' : '#fff',
            color: android ? 'var(--hero-accent-contrast)' : 'inherit',
          }}
        >
          <Icon name="Smartphone" size={15} fallback="Circle" /> Android
        </button>
        <button
          onClick={() => setTab('ios')}
          className="flex items-center justify-center gap-2 px-3 py-3 text-[0.78em]"
          style={{
            background: !android ? 'var(--hero-accent)' : '#fff',
            color: !android ? 'var(--hero-accent-contrast)' : 'inherit',
          }}
        >
          <Icon name="Apple" size={15} fallback="Smartphone" /> iPhone
        </button>
      </div>

      {android ? (
        <>
          <a
            href={APK_URL}
            className="flex items-center justify-center gap-2 w-full bg-[#1f1f1d] text-white px-4 py-4 text-[0.85em] tracking-wide"
          >
            <Icon name="Download" size={18} />
            Скачать обновление
          </a>
          <p className="h-mono-cap mt-3 text-center">
            Откройте файл после загрузки и подтвердите установку
          </p>
          <p className="h-mono-cap mt-1 text-center opacity-60">
            Установлена версия {APP_VERSION}
          </p>
        </>
      ) : (
        <div className="border border-[#e2e2df] p-4">
          <div className="h-label mb-3">На iPhone обновление ставится само</div>
          <p className="text-[0.78em] leading-relaxed mb-3">
            Достаточно закрыть и открыть приложение — свежая версия подтянется.
            Если иконки ещё нет на экране:
          </p>
          <ol className="space-y-2">
            {IOS_STEPS.map((s, i) => (
              <li key={i} className="flex gap-3 text-[0.78em] leading-relaxed">
                <span className="h-mono-cap shrink-0">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="h-head text-[22px] mt-10 mb-3">Безопасность</div>
      <PasswordCard />

      <div className="h-head text-[22px] mt-10 mb-3">Моя учётная запись</div>
      <div className="border border-[#e2e2df]">
        {[
          { label: 'Имя', value: String(me?.name || user?.name || '—') },
          { label: 'Логин', value: String(user?.login || '—') },
          { label: 'Телефон', value: String(me?.phone || '—') },
          {
            label: 'Статус',
            value: me?.club_member ? 'Член закрытого клуба' : 'Охотник',
          },
        ].map((l, i) => (
          <div
            key={l.label}
            className="flex flex-wrap gap-2 justify-between px-4 py-3"
            style={{ borderTop: i ? '1px solid #e2e2df' : 'none' }}
          >
            <span className="h-label">{l.label}</span>
            <span className="text-[0.75em]">{l.value}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <button className="h-cta-ghost" onClick={() => navigate('/my/profile')}>
          <Icon name="Pencil" size={14} /> Изменить мои данные
        </button>
        <button className="h-cta-ghost" onClick={leave}>
          <Icon name="LogOut" size={14} /> Выйти из кабинета
        </button>
      </div>

      <div className="mt-8 border border-[#e2e2df] px-4 py-3 flex gap-3">
        <Icon name="Info" size={16} className="shrink-0 mt-[2px]" />
        <p className="text-[0.78em] leading-relaxed">
          Забыли пароль или нужно сменить логин — обратитесь к хозяйству.
          Офлайн-карты качаются один раз в разделе «Карта хозяйства».
        </p>
      </div>
    </Layout>
  );
};

export default MySettings;