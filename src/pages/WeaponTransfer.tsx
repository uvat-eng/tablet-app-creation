import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import WeaponActDialog from '@/components/app/WeaponActDialog';
import { Row, listRows } from '@/lib/api';
import { kindLabel, ruDate, hasDocs } from '@/lib/weapons';
import useDataRefresh from '@/hooks/useDataRefresh';

const WeaponTransfer = () => {
  const [weapons, setWeapons] = useState<Row[]>([]);
  const [guests, setGuests] = useState<Row[]>([]);
  const [acts, setActs] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [w, g, a] = await Promise.all([
      listRows('weapons'),
      listRows('guests'),
      listRows('weapon_acts'),
    ]);
    setWeapons(w);
    setGuests(g);
    setActs(a);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);


  useDataRefresh(load);

  const readyCount = useMemo(() => guests.filter(hasDocs).length, [guests]);

  const gunName = (id: unknown) =>
    String(weapons.find((w) => String(w.id) === String(id))?.name || '—');

  return (
    <Layout
      index="Раздел / Передача оружия"
      title="Передача оружия"
      lede="Акт приёма-передачи на совместной охоте — статья 24.1 закона «Об оружии»."
    >
      {loading ? (
        <div className="h-label">Загружаю…</div>
      ) : (
        <>
          <div className="h-label mb-3">Выберите карабин</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {weapons.map((w) => (
              <button
                key={String(w.id)}
                onClick={() => setPicked(w)}
                className="border p-4 text-left flex items-start gap-3 hover:bg-[#fafaf8]"
                style={{ borderColor: '#e2e2df' }}
              >
                <Icon name="Crosshair" size={20} fallback="Target" />
                <div className="flex-1">
                  <div className="text-[0.95em] font-semibold">{String(w.name || '')}</div>
                  <div className="h-mono-cap normal-case text-[var(--hero-muted)] mt-1">
                    {kindLabel(w.kind)} · {String(w.caliber || '')}
                  </div>
                  <div className="h-mono-cap normal-case text-[var(--hero-muted)]">
                    № {String(w.serial_no || '—')}
                  </div>
                </div>
                <Icon name="ChevronRight" size={18} />
              </button>
            ))}
          </div>

          <div className="h-mono-cap normal-case text-[var(--hero-muted)] mb-8 leading-relaxed">
            Передать оружие можно охотнику с действующим охотбилетом и РОХа —
            сейчас таких {readyCount} из {guests.length}. У остальных данные
            заполняются в карточке охотника.
          </div>

          {acts.length > 0 && (
            <>
              <div className="h-head text-[20px] mb-3">Выданные акты</div>
              <div className="border" style={{ borderColor: '#e2e2df' }}>
                {acts.slice(0, 30).map((a) => (
                  <div
                    key={String(a.id)}
                    className="px-3 py-2 border-b flex flex-wrap items-center gap-x-3 gap-y-1"
                    style={{ borderColor: '#f0f0ee' }}
                  >
                    <span className="text-[0.85em] flex-1 min-w-[160px]">
                      {String(a.receiver_name || '')}
                    </span>
                    <span className="h-label">{gunName(a.weapon_id)}</span>
                    <span className="h-mono-cap normal-case text-[var(--hero-muted)]">
                      {ruDate(a.hunt_from)} – {ruDate(a.hunt_to)}
                    </span>
                    {a.file_url ? (
                      <a
                        href={String(a.file_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="h-label underline"
                      >
                        открыть
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {picked && (
        <WeaponActDialog
          weapon={picked}
          guests={guests}
          onClose={() => setPicked(null)}
          onDone={load}
        />
      )}
    </Layout>
  );
};

export default WeaponTransfer;
