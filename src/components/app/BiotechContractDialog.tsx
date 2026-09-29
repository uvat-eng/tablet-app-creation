import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { Row, downloadBiotech } from '@/lib/api';
import { LICENSE_NORMS } from '@/lib/biotech';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  guests: Row[];
}

const today = () => new Date().toISOString().slice(0, 10);

const BiotechContractDialog = ({ open, onOpenChange, guests }: Props) => {
  const [guestId, setGuestId] = useState('');
  const [number, setNumber] = useState('');
  const [signedOn, setSignedOn] = useState(today());
  const [busy, setBusy] = useState(false);

  const guest = useMemo(
    () => guests.find((g) => String(g.id) === guestId),
    [guests, guestId],
  );

  const submit = async () => {
    setBusy(true);
    try {
      await downloadBiotech({
        guest_id: guestId ? Number(guestId) : null,
        number,
        signed_on: signedOn,
        fileName: String(guest?.name || 'бланк').replace(/\s+/g, '_'),
      });
      toast.success('Договор собран — файл скачан и сохранён в «Готовые документы»');
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось собрать договор');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Договор на биотехнические мероприятия</DialogTitle>
        </DialogHeader>

        <p className="h-label leading-relaxed">
          Выберите охотника — реквизиты подставятся из карточки. Если оставить «Чистый
          бланк», договор выйдет с пустыми полями под нового желающего.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 mt-4">
          <label className="sm:col-span-2">
            <span className="h-label block mb-1">Охотник</span>
            <select
              className="w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white"
              value={guestId}
              onChange={(e) => setGuestId(e.target.value)}
            >
              <option value="">Чистый бланк — реквизиты вписать от руки</option>
              {guests.map((g) => (
                <option key={String(g.id)} value={String(g.id)}>
                  {String(g.name)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="h-label block mb-1">Номер договора</span>
            <input
              className="w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white"
              placeholder="1/2026-27"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
          </label>

          <label>
            <span className="h-label block mb-1">Дата договора</span>
            <input
              type="date"
              className="w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white"
              value={signedOn}
              onChange={(e) => setSignedOn(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-5 border border-[#e2e2df]">
          <div className="h-label px-3 py-2 bg-[var(--hero-surface)]">
            Таблица №1 — объём работ на одну особь
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-t border-[#e2e2df]">
                <th className="h-label text-left px-3 py-2 font-normal">Вид</th>
                <th className="h-label text-left px-3 py-2 font-normal">Кормушки</th>
                <th className="h-label text-left px-3 py-2 font-normal">Поля, га</th>
                <th className="h-label text-left px-3 py-2 font-normal">Солонцы</th>
                <th className="h-label text-left px-3 py-2 font-normal">Галечники</th>
              </tr>
            </thead>
            <tbody>
              {LICENSE_NORMS.map((n) => (
                <tr key={n.key} className="border-t border-[#e2e2df]">
                  <td className="px-3 py-2 text-[0.72em]">{n.species}</td>
                  <td className="px-3 py-2 text-[0.72em]">{n.feeder || '—'}</td>
                  <td className="px-3 py-2 text-[0.72em]">{n.fieldHa || '—'}</td>
                  <td className="px-3 py-2 text-[0.72em]">{n.salt}</td>
                  <td className="px-3 py-2 text-[0.72em]">{n.gravel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-2 mt-6">
          <button className="h-cta" onClick={submit} disabled={busy}>
            <Icon name="FileDown" size={15} />
            {busy ? 'Собираем…' : 'Скачать договор'}
          </button>
          <button className="h-cta-ghost" onClick={() => onOpenChange(false)}>
            Отмена
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BiotechContractDialog;
