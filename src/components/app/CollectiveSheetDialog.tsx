import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { Row, listRows, downloadCollective } from '@/lib/api';
import { toast } from 'sonner';

const SPECIES_LIST = [
  'Косуля сибирская',
  'Лось',
  'Кабан',
  'Медведь бурый',
  'Волк',
  'Рысь',
  'Тетерев',
  'Куропатка',
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

const CollectiveSheetDialog = ({ open, onOpenChange }: Props) => {
  const [guests, setGuests] = useState<Row[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'club' | 'hunters'>('club');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    hunt_date: today(),
    place: '',
    responsible: '',
    permit: '',
    species: 'Косуля сибирская',
    qty: '',
    instructor: '',
  });

  useEffect(() => {
    if (!open) return;
    listRows('guests').then(setGuests);
  }, [open]);

  const list = useMemo(() => {
    const src = guests.filter((g) =>
      tab === 'club' ? Boolean(g.club_member) : !g.club_member,
    );
    if (!query.trim()) return src;
    const q = query.trim().toLowerCase();
    return src.filter((g) => String(g.name || '').toLowerCase().includes(q));
  }, [guests, tab, query]);

  const pickedRows = useMemo(
    () => picked.map((id) => guests.find((g) => Number(g.id) === id)).filter(Boolean) as Row[],
    [picked, guests],
  );

  const toggle = (id: number) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const allVisible = list.length > 0 && list.every((g) => picked.includes(Number(g.id)));

  const toggleAll = () => {
    const visIds = list.map((g) => Number(g.id));
    setPicked((prev) =>
      allVisible ? prev.filter((x) => !visIds.includes(x)) : [...new Set([...prev, ...visIds])],
    );
  };

  const submit = async () => {
    if (!picked.length) {
      toast.error('Выберите хотя бы одного охотника');
      return;
    }
    setBusy(true);
    try {
      await downloadCollective({ ...form, rows: 21, guest_ids: picked });
      toast.success('Лист собран — файл скачан');
      onOpenChange(false);
      setPicked([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось собрать лист');
    } finally {
      setBusy(false);
    }
  };

  const field = (
    key: keyof typeof form,
    label: string,
    type = 'text',
    wide = false,
  ) => (
    <label className={wide ? 'sm:col-span-2' : ''}>
      <span className="h-label block mb-1">{label}</span>
      <input
        type={type}
        className="w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white"
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[820px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Коллективный лист охоты</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          {field('hunt_date', 'Дата охоты', 'date')}
          {field('permit', 'Разрешение на добычу')}
          {field('place', 'Место охоты', 'text', true)}
          {field('responsible', 'Ответственный за охоту', 'text', true)}
          <label>
            <span className="h-label block mb-1">Вид животных</span>
            <select
              className="w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white"
              value={form.species}
              onChange={(e) => setForm({ ...form, species: e.target.value })}
            >
              {SPECIES_LIST.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          {field('qty', 'Количество к добыче')}
          {field('instructor', 'Инструктаж провёл', 'text', true)}
        </div>

        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <button
              className={tab === 'club' ? 'h-cta' : 'h-cta-ghost'}
              onClick={() => setTab('club')}
            >
              Члены клуба
            </button>
            <button
              className={tab === 'hunters' ? 'h-cta' : 'h-cta-ghost'}
              onClick={() => setTab('hunters')}
            >
              База охотников
            </button>
            <span className="h-label ml-auto">Выбрано: {picked.length}</span>
          </div>

          <input
            className="w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white mb-2"
            placeholder="Поиск по фамилии"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <button className="h-label underline mb-2" onClick={toggleAll}>
            {allVisible ? 'Снять всех' : 'Выбрать всех'}
          </button>

          <div className="border border-[#e2e2df] max-h-[260px] overflow-y-auto">
            {list.map((g) => {
              const gid = Number(g.id);
              const on = picked.includes(gid);
              return (
                <button
                  key={gid}
                  onClick={() => toggle(gid)}
                  className="w-full flex items-center gap-3 px-3 py-2 border-b border-[#eeeeec] text-left hover:bg-[var(--hero-surface)]"
                >
                  <span
                    className="w-4 h-4 border border-[#b9b9b3] flex items-center justify-center shrink-0"
                    style={{
                      background: on ? 'var(--hero-accent)' : '#fff',
                      color: 'var(--hero-accent-contrast)',
                    }}
                  >
                    {on && <Icon name="Check" size={11} />}
                  </span>
                  <span className="text-[0.74em] flex-1">{String(g.name)}</span>
                  <span className="h-label">{String(g.hunt_ticket || '')}</span>
                </button>
              );
            })}
            {!list.length && (
              <div className="px-3 py-6 text-center h-label">Никого не нашлось</div>
            )}
          </div>

          {pickedRows.length > 0 && (
            <div className="h-label mt-3 leading-relaxed">
              В листе: {pickedRows.map((g) => String(g.name)).join(', ')}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-6">
          <button className="h-cta" onClick={submit} disabled={busy}>
            <Icon name="FileDown" size={15} />
            {busy ? 'Собираем…' : 'Скачать лист'}
          </button>
          <button className="h-cta-ghost" onClick={() => onOpenChange(false)}>
            Отмена
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CollectiveSheetDialog;
