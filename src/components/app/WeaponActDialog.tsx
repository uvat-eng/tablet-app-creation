import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '@/components/ui/icon';
import { Row, getToken } from '@/lib/api';
import { DOCS_URL, weaponTitle, hasDocs, missingWhat, today } from '@/lib/weapons';
import { printAct } from '@/lib/printAct';
import { toast } from 'sonner';

interface Props {
  weapon: Row;
  guests: Row[];
  onClose: () => void;
  onDone: () => void;
}

const WeaponActDialog = ({ weapon, guests, onClose, onDone }: Props) => {
  const [guestId, setGuestId] = useState('');
  const [actDate, setActDate] = useState(today());
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    const arr = q
      ? guests.filter((g) => String(g.name || '').toLowerCase().includes(q))
      : guests;
    return [...arr].sort((a, b) => {
      const d = Number(hasDocs(b)) - Number(hasDocs(a));
      if (d) return d;
      const c = Number(b.club_member) - Number(a.club_member);
      if (c) return c;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }, [guests, search]);

  const picked = guests.find((g) => String(g.id) === guestId) || null;
  const ready = picked && hasDocs(picked) && actDate && from && to;

  const make = async () => {
    if (!ready || !picked) return;
    if (to < from) {
      toast.error('Дата окончания раньше начала');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${DOCS_URL}?kind=weapon_act`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': getToken() },
        body: JSON.stringify({
          weapon_id: weapon.id,
          guest_id: picked.id,
          act_date: actDate,
          hunt_from: from,
          hunt_to: to,
        }),
      });
      if (!res.ok) {
        toast.error('Не удалось сформировать акт');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Акт ${weapon.name} ${picked.name}.docx`.replace(/\s+/g, '_');
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast.success('Акт готов и сохранён в документах');
      onDone();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[2800] flex items-end sm:items-center justify-center p-0 sm:p-6"
      style={{ background: 'rgba(0,0,0,.45)' }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-[560px] max-h-[92vh] overflow-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="h-label">Акт приёма-передачи</div>
            <div className="h-head text-[20px] mt-1">{weaponTitle(weapon)}</div>
            <div className="h-mono-cap normal-case text-[var(--hero-muted)] mt-1">
              № {String(weapon.serial_no || '—')}
            </div>
          </div>
          <button onClick={onClose} className="p-1">
            <Icon name="X" size={20} />
          </button>
        </div>

        <div className="h-label mb-2">Кому передаём</div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по фамилии"
          className="w-full border p-2 mb-2 text-[0.85em]"
          style={{ borderColor: '#e2e2df' }}
        />

        <div className="border max-h-[220px] overflow-auto mb-4" style={{ borderColor: '#e2e2df' }}>
          {list.map((g) => {
            const ok = hasDocs(g);
            const on = String(g.id) === guestId;
            return (
              <button
                key={String(g.id)}
                disabled={!ok}
                onClick={() => setGuestId(String(g.id))}
                className="w-full text-left px-3 py-2 border-b flex items-center gap-2"
                style={{
                  borderColor: '#f0f0ee',
                  background: on ? 'var(--hero-accent)' : '#fff',
                  color: ok ? 'inherit' : '#9a9a95',
                  cursor: ok ? 'pointer' : 'not-allowed',
                }}
              >
                <Icon
                  name={ok ? (on ? 'CircleCheck' : 'Circle') : 'CircleAlert'}
                  size={15}
                  fallback="Circle"
                />
                <span className="flex-1 text-[0.85em]">{String(g.name || '')}</span>
                {g.club_member ? <span className="h-label">клуб</span> : null}
                {!ok && <span className="h-label">{missingWhat(g)}</span>}
              </button>
            );
          })}
          {!list.length && (
            <div className="px-3 py-4 text-[0.8em] text-[var(--hero-muted)]">
              Никого не нашлось
            </div>
          )}
        </div>

        {picked && !hasDocs(picked) && (
          <div className="mb-4 p-3 text-[0.78em]" style={{ background: '#fdf3f2' }}>
            У охотника {missingWhat(picked)} — по закону передать оружие нельзя.
            Заполните данные в карточке охотника.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <label className="block">
            <span className="h-label">Дата акта</span>
            <input
              type="date"
              value={actDate}
              onChange={(e) => setActDate(e.target.value)}
              className="w-full border p-2 mt-1 text-[0.85em]"
              style={{ borderColor: '#e2e2df' }}
            />
          </label>
          <label className="block">
            <span className="h-label">Охота с</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full border p-2 mt-1 text-[0.85em]"
              style={{ borderColor: '#e2e2df' }}
            />
          </label>
          <label className="block">
            <span className="h-label">Охота по</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full border p-2 mt-1 text-[0.85em]"
              style={{ borderColor: '#e2e2df' }}
            />
          </label>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            className="h-cta flex-1 justify-center"
            disabled={!ready || busy}
            onClick={make}
            style={{ opacity: ready && !busy ? 1 : 0.45 }}
          >
            <Icon name="FileText" size={16} />
            {busy ? 'Готовлю акт…' : 'Скачать Word'}
          </button>
          <button
            className="h-cta-ghost flex-1 justify-center"
            disabled={!ready}
            onClick={() => {
              if (!picked) return;
              const ok = printAct(weapon, picked, { actDate, from, to });
              if (!ok) toast.error('Разрешите всплывающие окна для печати');
            }}
            style={{ opacity: ready ? 1 : 0.45 }}
          >
            <Icon name="Printer" size={16} />
            Печать
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default WeaponActDialog;