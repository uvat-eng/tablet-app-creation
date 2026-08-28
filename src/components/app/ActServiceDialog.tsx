import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PriceItem, lineSum, money, CALC_LABELS } from '@/lib/price';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  price: PriceItem[];
  initial?: PriceItem | null;
  defaultHunters?: number;
  defaultDays?: number;
  onSubmit: (item: PriceItem) => void;
}

const input = 'w-full border border-[#e2e2df] px-3 py-2 text-[0.75em] bg-white';

const ActServiceDialog = ({
  open,
  onOpenChange,
  price,
  initial,
  defaultHunters = 1,
  defaultDays = 1,
  onSubmit,
}: Props) => {
  const [item, setItem] = useState<PriceItem | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setItem(initial ? { ...initial } : null);
  }, [open, initial]);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? price.filter(
          (p) =>
            p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q),
        )
      : price;
    const map = new Map<string, PriceItem[]>();
    list.forEach((p) => {
      const k = p.category || 'Прочее';
      map.set(k, [...(map.get(k) || []), p]);
    });
    return Array.from(map.entries());
  }, [price, search]);

  const pick = (p: PriceItem) =>
    setItem({
      ...p,
      hunters: p.hunters || defaultHunters || 1,
      days: p.mode === 'perDayPerHunter' ? p.days || defaultDays || 1 : 0,
      discount: p.discount || 0,
    });

  const set = (f: keyof PriceItem, v: string) =>
    setItem((prev) => (prev ? { ...prev, [f]: Number(v || 0) } : prev));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] rounded-none border-black">
        <DialogHeader>
          <DialogTitle className="h-head text-[22px]">
            {item ? item.name : 'Выберите услугу'}
          </DialogTitle>
        </DialogHeader>

        {!item ? (
          <>
            <input
              className={input}
              placeholder="Поиск по названию"
              value={search}
              autoFocus
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="max-h-[52vh] overflow-y-auto -mx-1 px-1 mt-2">
              {groups.map(([cat, list]) => (
                <div key={cat} className="mb-4">
                  <div className="h-label mb-2">{cat}</div>
                  <div className="space-y-1">
                    {list.map((p) => (
                      <button
                        key={`${p.service_id}-${p.name}`}
                        onClick={() => pick(p)}
                        className="w-full text-left border border-[#e2e2df] px-3 py-2 hover:bg-[var(--hero-surface)] flex justify-between gap-3"
                      >
                        <span className="text-[0.78em] truncate">{p.name}</span>
                        <span className="text-[0.78em] whitespace-nowrap">{money(p.tariff)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {!groups.length && (
                <p className="text-[0.8em] text-[var(--hero-muted)] py-4">Ничего не найдено</p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="h-mono-cap normal-case text-[var(--hero-muted)]">
              {CALC_LABELS[item.mode]} · тариф из прайса {money(item.tariff)}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 mt-3">
              <label className="block">
                <span className="h-label block mb-1">
                  {item.mode === 'flat' ? 'Количество' : 'Охотников'}
                </span>
                <input
                  className={input}
                  type="number"
                  value={item.hunters}
                  onChange={(e) => set('hunters', e.target.value)}
                />
              </label>

              {item.mode === 'perDayPerHunter' && (
                <label className="block">
                  <span className="h-label block mb-1">Дней</span>
                  <input
                    className={input}
                    type="number"
                    value={item.days}
                    onChange={(e) => set('days', e.target.value)}
                  />
                </label>
              )}

              <label className="block">
                <span className="h-label block mb-1">Тариф, ₽</span>
                <input
                  className={input}
                  type="number"
                  value={item.tariff}
                  onChange={(e) => set('tariff', e.target.value)}
                />
              </label>

              <label className="block">
                <span className="h-label block mb-1">Скидка на позицию, %</span>
                <input
                  className={input}
                  type="number"
                  value={item.discount}
                  onChange={(e) => set('discount', e.target.value)}
                />
              </label>
            </div>

            <div className="mt-4 border border-[#e2e2df] px-4 py-3 flex items-center justify-between">
              <span className="h-label">Сумма позиции</span>
              <span className="h-head text-[20px]">{money(lineSum(item))}</span>
            </div>

            <div className="flex gap-2 mt-4">
              {!initial && (
                <button className="h-cta-ghost" onClick={() => setItem(null)}>
                  Другая услуга
                </button>
              )}
              <button
                className="h-cta ml-auto"
                onClick={() => {
                  onSubmit(item);
                  onOpenChange(false);
                }}
              >
                {initial ? 'Сохранить' : 'Добавить в акт'}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ActServiceDialog;
