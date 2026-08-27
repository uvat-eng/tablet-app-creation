const REVIEWS = [
  { name: 'Сергей М.', place: 'Пермь', text: 'Егерь вывел на кабана в первый же вечер. База тёплая, баня — как надо.' },
  { name: 'Андрей К.', place: 'Москва', text: 'Приехали вчетвером на лося. Всё по лицензии, транспорт до угодий свой.' },
  { name: 'Игорь В.', place: 'Казань', text: 'Жили в гостинице, кормили домашним. Вернёмся весной на утку.' },
];

const Reviews = () => (
  <div className="grid gap-px" style={{ background: '#e2e2df', border: '1px solid #e2e2df', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
    {REVIEWS.map((r) => (
      <figure key={r.name} className="bg-white p-5">
        <blockquote className="h-mono-cap normal-case text-[0.72em] leading-relaxed">{r.text}</blockquote>
        <figcaption className="h-label mt-4">
          {r.name} — {r.place}
        </figcaption>
      </figure>
    ))}
  </div>
);

export default Reviews;
