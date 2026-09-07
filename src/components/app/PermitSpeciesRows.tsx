import Icon from '@/components/ui/icon';
import {
  GAME_LIST,
  SEX_OPTIONS,
  AGE_OPTIONS,
  SpeciesRow,
  emptySpecies,
  rubles,
} from '@/lib/permits';

interface Props {
  rows: SpeciesRow[];
  onChange: (rows: SpeciesRow[]) => void;
}

const PermitSpeciesRows = ({ rows, onChange }: Props) => {
  const patch = (i: number, part: Partial<SpeciesRow>) => {
    const next = rows.map((r, idx) => (idx === i ? { ...r, ...part } : r));
    onChange(next);
  };

  const pickGame = (i: number, name: string) => {
    const found = GAME_LIST.find((g) => g.name === name);
    const qty = Number(rows[i].qty || 1);
    patch(i, {
      name,
      price: found ? String(found.price * (qty || 1)) : rows[i].price,
    });
  };

  const setQty = (i: number, qty: string) => {
    const found = GAME_LIST.find((g) => g.name === rows[i].name);
    patch(i, {
      qty,
      price: found ? String(found.price * (Number(qty) || 0)) : rows[i].price,
    });
  };

  const total = rows.reduce((sum, r) => sum + (Number(r.price) || 0), 0);

  return (
    <div className="border border-[#e2e2df]">
      <div className="h-label px-3 py-2 bg-[var(--hero-surface)] flex items-center justify-between">
        <span>Разрешено к добыче</span>
        <span>Итого: {rubles(total)}</span>
      </div>

      {rows.map((r, i) => (
        <div key={i} className="border-t border-[#e2e2df] p-3 grid gap-3 sm:grid-cols-12">
          <label className="sm:col-span-5">
            <span className="h-label block mb-1">Вид дичи</span>
            <select
              className="w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white"
              value={r.name}
              onChange={(e) => pickGame(i, e.target.value)}
            >
              <option value="">Выберите вид</option>
              {GAME_LIST.map((g) => (
                <option key={g.name} value={g.name}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>

          <label className="sm:col-span-2">
            <span className="h-label block mb-1">Кол-во</span>
            <input
              type="number"
              min="1"
              className="w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white"
              value={r.qty}
              onChange={(e) => setQty(i, e.target.value)}
            />
          </label>

          <label className="sm:col-span-2">
            <span className="h-label block mb-1">Пол</span>
            <select
              className="w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white"
              value={r.sex}
              onChange={(e) => patch(i, { sex: e.target.value })}
            >
              {SEX_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s || '—'}
                </option>
              ))}
            </select>
          </label>

          <label className="sm:col-span-2">
            <span className="h-label block mb-1">Возраст</span>
            <select
              className="w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white"
              value={r.age}
              onChange={(e) => patch(i, { age: e.target.value })}
            >
              {AGE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s || '—'}
                </option>
              ))}
            </select>
          </label>

          <div className="sm:col-span-1 flex items-end">
            {rows.length > 1 && (
              <button
                className="h-cta-ghost w-full justify-center"
                onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
                title="Убрать строку"
              >
                <Icon name="Trash2" size={14} />
              </button>
            )}
          </div>

          <label className="sm:col-span-12">
            <span className="h-label block mb-1">Стоимость услуги, рублей</span>
            <input
              type="number"
              min="0"
              className="w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white"
              value={r.price}
              onChange={(e) => patch(i, { price: e.target.value })}
              placeholder="Подставилась по прайсу — можно изменить"
            />
          </label>
        </div>
      ))}

      <div className="border-t border-[#e2e2df] p-3">
        <button className="h-cta-ghost" onClick={() => onChange([...rows, emptySpecies()])}>
          <Icon name="Plus" size={14} /> Добавить вид
        </button>
      </div>
    </div>
  );
};

export default PermitSpeciesRows;
