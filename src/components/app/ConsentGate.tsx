import { useState } from 'react';
import Brand from '@/components/app/Brand';
import Icon from '@/components/ui/icon';
import { PRIVACY_SECTIONS, PRIVACY_OPERATOR, PRIVACY_UPDATED } from '@/lib/privacyText';

const KEY = 'hb_privacy_accepted_v1';

export const isConsentGiven = () => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return true;
  }
};

interface Props {
  onAccept: () => void;
}

const ConsentGate = ({ onAccept }: Props) => {
  const [checked, setChecked] = useState(false);
  const [full, setFull] = useState(false);

  const accept = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* хранилище недоступно */
    }
    onAccept();
  };

  if (full) {
    return (
      <div className="h-shell min-h-screen px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-[720px] mx-auto">
          <button
            type="button"
            className="h-label underline mb-5 flex items-center gap-1"
            onClick={() => setFull(false)}
          >
            <Icon name="ChevronLeft" size={13} /> назад
          </button>

          <h1 className="h-head text-[30px]">Политика конфиденциальности</h1>
          <p className="h-mono-cap mt-3">редакция от {PRIVACY_UPDATED}</p>

          <div className="mt-6 border border-[#e2e2df] px-4 py-4">
            <span className="h-label block mb-2">Оператор персональных данных</span>
            <p className="text-[0.8em] leading-relaxed">{PRIVACY_OPERATOR}</p>
          </div>

          <div className="mt-8 space-y-8">
            {PRIVACY_SECTIONS.map((s, i) => (
              <section key={s.title}>
                <h2 className="h-head text-[18px]">
                  {i + 1}. {s.title}
                </h2>
                <div className="mt-3 space-y-3">
                  {s.body.map((p, k) => (
                    <p key={k} className="text-[0.82em] leading-relaxed">
                      {p}
                    </p>
                  ))}
                  {s.list && (
                    <ul className="space-y-2 mt-2">
                      {s.list.map((li) => (
                        <li key={li} className="flex gap-2 text-[0.82em] leading-relaxed">
                          <span className="shrink-0">—</span>
                          <span>{li}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ))}
          </div>

          <button className="h-cta mt-10 w-full text-center" onClick={() => setFull(false)}>
            Вернуться к согласию
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-shell min-h-screen flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-[460px]">
        <div className="mb-8">
          <Brand size="md" />
        </div>

        <h1 className="h-head text-[32px]">Прежде чем войти</h1>
        <p className="h-mono-cap mt-3">
          Приложение работает с личными данными охотников и сотрудников.
        </p>

        <div className="mt-7 border border-[#e2e2df] bg-white px-4 py-4">
          <p className="text-[0.82em] leading-relaxed">
            Мы обрабатываем ваши контакты, паспортные данные, охотничий билет и
            разрешение на оружие — только чтобы оформить путёвки, договоры и акты,
            которых требует закон. Данные не передаются третьим лицам и не используются
            для рекламы.
          </p>
          <button
            type="button"
            className="h-label underline mt-3 inline-flex items-center gap-1"
            onClick={() => setFull(true)}
          >
            <Icon name="FileText" size={13} fallback="Circle" />
            Читать политику конфиденциальности целиком
          </button>
        </div>

        <button
          type="button"
          onClick={() => setChecked((v) => !v)}
          className="w-full flex items-start gap-3 mt-6 text-left"
        >
          <span
            className="w-5 h-5 border border-[#1f1f1d] shrink-0 mt-[2px] flex items-center justify-center"
            style={{
              background: checked ? 'var(--hero-accent)' : '#fff',
              color: 'var(--hero-accent-contrast)',
            }}
          >
            {checked && <Icon name="Check" size={13} />}
          </span>
          <span className="text-[0.8em] leading-relaxed">
            Я прочитал политику конфиденциальности и даю согласие на обработку моих
            персональных данных в соответствии с Федеральным законом № 152-ФЗ.
          </span>
        </button>

        <button
          className="h-cta mt-6 w-full text-center"
          disabled={!checked}
          style={{ opacity: checked ? 1 : 0.45 }}
          onClick={accept}
        >
          Принимаю
        </button>

        <p className="h-label mt-4 leading-relaxed text-center">
          Без согласия вход в приложение невозможен.
        </p>
      </div>
    </div>
  );
};

export default ConsentGate;
