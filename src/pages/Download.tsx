import Brand from '@/components/app/Brand';
import Icon from '@/components/ui/icon';

const APK_URL =
  'https://cdn.poehali.dev/projects/980fc694-d631-4b58-8bb8-84299cd838a9/bucket/apk/malyshenskoe.apk';

const steps = [
  'Нажмите кнопку «Скачать приложение» — файл сохранится в «Загрузки».',
  'Откройте скачанный файл и подтвердите установку.',
  'Если Android попросит разрешение на установку из этого источника — разрешите.',
  'Войдите под своим логином. Затем откройте раздел «Карта» и нажмите «Скачать карты» — они загрузятся один раз и дальше работают без интернета.',
];

const Download = () => (
  <div className="h-shell min-h-screen flex items-center justify-center px-6 py-12">
    <div className="w-full max-w-[520px]">
      <div className="mb-8">
        <Brand size="md" />
      </div>

      <h1 className="h-head text-[34px]">Приложение для планшета</h1>
      <p className="h-mono-cap mt-3">
        Версия для Android. Карты угодий встроены и работают без интернета.
      </p>

      <a
        href={APK_URL}

        className="mt-8 flex items-center justify-center gap-2 w-full bg-[#1f1f1d] text-white px-4 py-4 text-[0.85em] tracking-wide"
      >
        <Icon name="Download" size={18} />
        Скачать приложение
      </a>

      <p className="h-mono-cap mt-3 text-center">Размер 4 МБ · карты качаются отдельно</p>

      <div className="mt-10 border-t border-[#e2e2df] pt-6">
        <span className="h-label block mb-4">Как установить</span>
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3 text-[0.82em] leading-relaxed">
              <span className="h-mono-cap shrink-0">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-8 border border-[#e2e2df] px-4 py-3 flex gap-3">
        <Icon name="Info" size={16} className="shrink-0 mt-[2px]" />
        <p className="text-[0.78em] leading-relaxed">
          Данные приложения хранятся на общем сервере — записи с разных планшетов
          синхронизируются автоматически.
        </p>
      </div>
    </div>
  </div>
);

export default Download;