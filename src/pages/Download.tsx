import { useState } from 'react';
import Brand from '@/components/app/Brand';
import StoreAssets from '@/components/app/StoreAssets';
import Icon from '@/components/ui/icon';
import { APK_URL, APP_VERSION } from '@/lib/appVersion';
import { isIOS } from '@/lib/platform';


const DEVICE_STEPS = [
  'Нажмите кнопку «Скачать приложение» — файл сохранится в «Загрузки».',
  'Откройте скачанный файл и подтвердите установку.',
  'Если телефон попросит разрешение на установку из этого источника — разрешите.',
  'Войдите под своим логином. Затем откройте раздел «Карта» и нажмите «Скачать карты» — они загрузятся один раз и дальше работают без интернета.',
];

const IOS_STEPS = [
  'Откройте этот сайт в Safari — именно в Safari, другие браузеры не умеют устанавливать.',
  'Нажмите кнопку «Поделиться» внизу экрана — квадрат со стрелкой вверх.',
  'Пролистайте список и выберите «На экран «Домой»».',
  'Нажмите «Добавить» — иконка появится на рабочем столе рядом с обычными приложениями.',
  'Запускайте с иконки и входите своим логином. Работает как приложение, на весь экран.',
];

const Download = () => {
  const ios = isIOS();
  const [tab, setTab] = useState<'device' | 'ios'>(ios ? 'ios' : 'device');
  const device = !ios && tab === 'device';
  const steps = device ? DEVICE_STEPS : IOS_STEPS;

  return (
    <div className="h-shell min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[520px]">
        <div className="mb-8">
          <Brand size="md" />
        </div>

        <h1 className="h-head text-[34px]">Приложение хозяйства</h1>
        <p className="h-mono-cap mt-3">
          {ios
            ? 'Установите приложение на iPhone или iPad за несколько секунд.'
            : 'Планшет, телефон или iPhone — выберите своё устройство.'}
        </p>

        {!ios && (
          <div className="mt-7 grid grid-cols-2 gap-px" style={{ background: '#e2e2df' }}>
            <button
              onClick={() => setTab('device')}
              className="flex items-center justify-center gap-2 px-3 py-3 text-[0.78em]"
              style={{
                background: device ? 'var(--hero-accent)' : '#fff',
                color: device ? 'var(--hero-accent-contrast)' : 'inherit',
              }}
            >
              <Icon name="Smartphone" size={15} fallback="Circle" /> Телефон
            </button>
            <button
              onClick={() => setTab('ios')}
              className="flex items-center justify-center gap-2 px-3 py-3 text-[0.78em]"
              style={{
                background: !device ? 'var(--hero-accent)' : '#fff',
                color: !device ? 'var(--hero-accent-contrast)' : 'inherit',
              }}
            >
              <Icon name="Apple" size={15} fallback="Smartphone" /> iPhone и iPad
            </button>
          </div>
        )}

        {device ? (
          <>
            <a
              href={APK_URL}
              className="mt-6 flex items-center justify-center gap-2 w-full bg-[#1f1f1d] text-white px-4 py-4 text-[0.85em] tracking-wide"
            >
              <Icon name="Download" size={18} />
              Скачать приложение
            </a>
            <p className="h-mono-cap mt-3 text-center">
              Версия {APP_VERSION} · размер 4 МБ · карты качаются отдельно
            </p>
          </>
        ) : (
          <div className="mt-6 border border-[#e2e2df] px-4 py-4 flex gap-3">
            <Icon name="Share" size={16} className="shrink-0 mt-[2px]" fallback="Upload" />
            <p className="text-[0.8em] leading-relaxed">
              Для iPhone скачивать ничего не нужно. Приложение ставится прямо из Safari
              за пять секунд — по шагам ниже.
            </p>
          </div>
        )}

        <div className="mt-10 border-t border-[#e2e2df] pt-6">
          <span className="h-label block mb-4">
            {device ? 'Как установить на телефон' : 'Как установить на iPhone'}
          </span>
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-[0.82em] leading-relaxed">
                <span className="h-mono-cap shrink-0">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>

        {!ios && (
          <div className="mt-10 border-t border-[#e2e2df] pt-6">
            <span className="h-label block mb-3">Иконки для магазина приложений</span>
            <StoreAssets />
          </div>
        )}

        <div className="mt-8 border border-[#e2e2df] px-4 py-3 flex gap-3">
          <Icon name="Info" size={16} className="shrink-0 mt-[2px]" />
          <p className="text-[0.78em] leading-relaxed">
            Данные общие для всех устройств — записи синхронизируются автоматически.
            {!device && ' На iPhone офлайн-карты недоступны, нужен интернет.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Download;