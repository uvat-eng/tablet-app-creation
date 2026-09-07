import { Link } from 'react-router-dom';
import Brand from '@/components/app/Brand';
import Icon from '@/components/ui/icon';
import { PRIVACY_SECTIONS, PRIVACY_UPDATED, PRIVACY_OPERATOR } from '@/lib/privacyText';

const Privacy = () => (
  <div className="h-shell min-h-screen px-6 py-10">
    <div className="w-full max-w-[720px] mx-auto">
      <div className="mb-8">
        <Brand size="md" />
      </div>

      <Link to="/" className="h-label underline mb-5 inline-flex items-center gap-1">
        <Icon name="ChevronLeft" size={13} /> назад
      </Link>

      <h1 className="h-head text-[32px]">Политика конфиденциальности</h1>
      <p className="h-mono-cap mt-3">
        Обработка персональных данных в приложении «Малышенское» · редакция от {PRIVACY_UPDATED}
      </p>

      <div className="mt-6 border border-[#e2e2df] px-4 py-4">
        <span className="h-label block mb-2">Оператор персональных данных</span>
        <p className="text-[0.8em] leading-relaxed">{PRIVACY_OPERATOR}</p>
      </div>

      <div className="mt-8 space-y-8">
        {PRIVACY_SECTIONS.map((s, i) => (
          <section key={s.title}>
            <h2 className="h-head text-[19px]">
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

      <div className="mt-10 border-t border-[#e2e2df] pt-6 h-label leading-relaxed">
        Вопросы по обработке данных и отзыв согласия — по адресу оператора, указанному выше.
      </div>
    </div>
  </div>
);

export default Privacy;
