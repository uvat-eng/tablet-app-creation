import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { Row, downloadBioAct } from '@/lib/api';
import { EMPTY_DONE, addWork, earnedLicenses, hoursText } from '@/lib/biotech';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  guests: Row[];
  rows: Row[];
  year: number | 'all';
}

const today = () => new Date().toISOString().slice(0, 10);

const BioActDialog = ({ open, onOpenChange, guests, rows, year }: Props) => {
  const [guestId, setGuestId] = useState('');
  const [number, setNumber] = useState('');
  const [signedOn, setSignedOn] = useState(today());
  const [busy, setBusy] = useState(false);

  const guest = useMemo(
    () => guests.find((g) => String(g.id) === guestId),
    [guests, guestId],
  );

  const works = useMemo(() => {
    if (!guestId) return [];
    return rows.filter((r) => {
      if (String(r.guest_id || '') !== guestId) return false;
      if (year === 'all') return true;
      return String(r.work_on || '').slice(0, 4) === String(year);
    });
  }, [rows, guestId, year]);

  const summary = useMemo(() => {
    let done = EMPTY_DONE;
    let hours = 0;
    works.forEach((r) => {
      done = addWork(done, String(r.kind), Number(r.qty || 0));
      hours += Number(r.hours || 0);
    });
    return { done, hours, licenses: earnedLicenses(done) };
  }, [works]);

  const earned = summary.licenses.filter((l) => l.count > 0);

  const submit = async () => {
    if (!guestId) {
      toast.error('Выберите охотника');
      return;
    }
    setBusy(true);
    try {
      await downloadBioAct({
        guest_id: Number(guestId),
        number,
        signed_on: signedOn,
        period: year === 'all' ? '' : `${year} год`,
        year: year === 'all' ? null : Number(year),
        licenses: earned.map((l) => `${l.species} — ${l.count} шт`),
        fileName: String(guest?.name || '').replace(/\s+/g, '_'),
      });
      toast.success('Акт собран — файл скачан и сохранён в «Готовые документы»');
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось собрать акт');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Акт выполненных биотехнических работ</DialogTitle>
        </DialogHeader>

        <p className="h-label leading-relaxed">
          В акт попадут все работы охотника
          {year === 'all' ? ' за всё время' : ` за ${year} год`}. Подписывается с охотником
          и служит основанием для выдачи разрешений.
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

          <label>
            <span className="h-label block mb-1">Номер акта</span>
            <input
              className="w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white"
              placeholder="1"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
          </label>

          <label>
            <span className="h-label block mb-1">Дата акта</span>
            <input
              type="date"
              className="w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white"
              value={signedOn}
              onChange={(e) => setSignedOn(e.target.value)}
            />
          </label>
        </div>

        {guestId && (
          <div className="mt-5 border border-[#e2e2df] p-4">
            <div className="h-label mb-2">Попадёт в акт — {works.length} записей</div>
            <div className="text-[0.75em] leading-relaxed">
              кормушки {summary.done.feeder} · поля {summary.done.fieldHa} га · солонцы{' '}
              {summary.done.salt} · галечники {summary.done.gravel}
              {summary.hours > 0 && ` · ${hoursText(summary.hours)}`}
            </div>
            <div className="h-label mt-3">
              {earned.length
                ? `Даёт право на: ${earned.map((l) => `${l.species} — ${l.count} шт`).join(', ')}`
                : 'Норматив ни по одному виду пока не добран'}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-6">
          <button className="h-cta" onClick={submit} disabled={busy || !guestId}>
            <Icon name="FileDown" size={15} />
            {busy ? 'Собираем…' : 'Скачать акт'}
          </button>
          <button className="h-cta-ghost" onClick={() => onOpenChange(false)}>
            Отмена
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BioActDialog;
