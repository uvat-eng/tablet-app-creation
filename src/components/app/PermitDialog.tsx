import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import PermitSpeciesRows from '@/components/app/PermitSpeciesRows';
import PermitShare from '@/components/app/PermitShare';
import { Row, PermitResult, buildPermit } from '@/lib/api';
import { GROUNDS, SpeciesRow, emptySpecies, today, plusDays } from '@/lib/permits';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  guests: Row[];
  onCreated: () => void;
}

const PermitDialog = ({ open, onOpenChange, guests, onCreated }: Props) => {
  const [guestId, setGuestId] = useState('');
  const [ground, setGround] = useState('krotovsky');
  const [permitNo, setPermitNo] = useState('');
  const [applyOn, setApplyOn] = useState(today());
  const [dateFrom, setDateFrom] = useState(today());
  const [dateTo, setDateTo] = useState(plusDays(14));
  const [special, setSpecial] = useState('');
  const [note, setNote] = useState('');
  const [rows, setRows] = useState<SpeciesRow[]>([emptySpecies()]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PermitResult | null>(null);

  const guest = useMemo(
    () => guests.find((g) => String(g.id) === guestId),
    [guests, guestId],
  );

  const missing = useMemo(() => {
    if (!guest) return [];
    const need: [string, unknown][] = [
      ['паспорт', guest.passport],
      ['кем выдан паспорт', guest.passport_issued],
      ['адрес', guest.address],
      ['телефон', guest.phone],
      ['охотбилет', guest.hunt_ticket],
      ['кем выдан охотбилет', guest.hunt_ticket_issued],
    ];
    return need.filter(([, v]) => !String(v || '').trim()).map(([k]) => k);
  }, [guest]);

  const reset = () => {
    setResult(null);
    setGuestId('');
    setPermitNo('');
    setSpecial('');
    setNote('');
    setRows([emptySpecies()]);
  };

  const close = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const submit = async () => {
    if (!guestId) {
      toast.error('Выберите охотника');
      return;
    }
    if (!rows.some((r) => r.name)) {
      toast.error('Укажите хотя бы один вид дичи');
      return;
    }
    if (dateTo < dateFrom) {
      toast.error('Дата окончания раньше даты начала');
      return;
    }

    setBusy(true);
    try {
      const data = await buildPermit({
        guest_id: Number(guestId),
        ground,
        permit_no: permitNo,
        apply_on: applyOn,
        date_from: dateFrom,
        date_to: dateTo,
        special_note: special,
        note,
        species: rows.filter((r) => r.name),
      });
      setResult(data);
      onCreated();
      toast.success('Путёвка собрана и сохранена в журнале');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось собрать путёвку');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-[760px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {result ? 'Путёвка готова' : 'Создать путёвку'}
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <>
            <p className="h-label leading-relaxed">
              В файле два листа: заявление на выдачу разрешения и путёвка-договор.
              Данные охотника подставлены из карточки.
            </p>
            <PermitShare result={result} guestName={String(guest?.name || '')} />
            <div className="flex flex-wrap gap-2 mt-5">
              <button className="h-cta-ghost" onClick={reset}>
                <Icon name="Plus" size={15} /> Создать ещё одну
              </button>
              <button className="h-cta-ghost" onClick={() => close(false)}>
                Закрыть
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="h-label leading-relaxed">
              Выберите охотника — паспорт, адрес и охотбилет подставятся из карточки.
              Останется указать угодье, сроки и добычу.
            </p>

            <div className="grid gap-4 sm:grid-cols-2 mt-4">
              <label className="sm:col-span-2">
                <span className="h-label block mb-1">Охотник</span>
                <select
                  className="w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white"
                  value={guestId}
                  onChange={(e) => setGuestId(e.target.value)}
                >
                  <option value="">Выберите охотника</option>
                  {guests.map((g) => (
                    <option key={String(g.id)} value={String(g.id)}>
                      {String(g.name)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="sm:col-span-2">
                <span className="h-label block mb-1">Участок</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {GROUNDS.map((g) => (
                    <button
                      key={g.key}
                      onClick={() => setGround(g.key)}
                      className="border px-3 py-3 text-left"
                      style={{
                        borderColor: ground === g.key ? '#1f1f1d' : '#e2e2df',
                        background: ground === g.key ? '#1f1f1d' : '#fff',
                        color: ground === g.key ? '#fff' : 'inherit',
                      }}
                    >
                      <div className="text-[0.82em]">{g.label}</div>
                      <div
                        className="text-[0.66em] mt-1 leading-snug"
                        style={{ opacity: 0.7 }}
                      >
                        {g.full}
                      </div>
                    </button>
                  ))}
                </div>
              </label>

              <label>
                <span className="h-label block mb-1">Номер разрешения</span>
                <input
                  className="w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white"
                  placeholder="004521"
                  value={permitNo}
                  onChange={(e) => setPermitNo(e.target.value)}
                />
              </label>

              <label>
                <span className="h-label block mb-1">Дата заявления</span>
                <input
                  type="date"
                  className="w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white"
                  value={applyOn}
                  onChange={(e) => setApplyOn(e.target.value)}
                />
              </label>

              <label>
                <span className="h-label block mb-1">Охота с</span>
                <input
                  type="date"
                  className="w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </label>

              <label>
                <span className="h-label block mb-1">Охота по</span>
                <input
                  type="date"
                  className="w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </label>
            </div>

            {guest && missing.length > 0 && (
              <div className="border border-[#e2e2df] px-3 py-3 mt-4 flex gap-3">
                <Icon name="TriangleAlert" size={16} className="shrink-0 mt-[2px]" />
                <p className="text-[0.76em] leading-relaxed">
                  В карточке охотника не заполнено: {missing.join(', ')}. Документ
                  соберётся, но эти строки останутся пустыми — впишите от руки или
                  дополните карточку.
                </p>
              </div>
            )}

            <div className="mt-5">
              <PermitSpeciesRows rows={rows} onChange={setRows} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 mt-4">
              <label>
                <span className="h-label block mb-1">Особая отметка</span>
                <input
                  className="w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white"
                  placeholder="охота с легавой собакой"
                  value={special}
                  onChange={(e) => setSpecial(e.target.value)}
                />
              </label>

              <label>
                <span className="h-label block mb-1">Примечание</span>
                <input
                  className="w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2 mt-6">
              <button className="h-cta" onClick={submit} disabled={busy}>
                <Icon name="FileDown" size={15} />
                {busy ? 'Собираем…' : 'Сформировать путёвку'}
              </button>
              <button className="h-cta-ghost" onClick={() => close(false)}>
                Отмена
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PermitDialog;
