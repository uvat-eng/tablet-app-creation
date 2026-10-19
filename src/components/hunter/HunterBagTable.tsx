import { Row } from '@/lib/api';
import { SPECIES_ONE } from '@/lib/species';

interface Props {
  bag: Row[];
  locations: Row[];
  onEdit: (b: Row) => void;
  onDrop: (b: Row) => void;
}

const HunterBagTable = ({ bag, locations, onEdit, onDrop }: Props) => (
  <>
    <div className="h-head text-[22px] mb-3">Трофеи охотника</div>
    <div className="border border-[#e2e2df] overflow-x-auto mb-10">
      <table className="w-full min-w-[720px]">
        <thead>
          <tr className="bg-[var(--hero-surface)]">
            <th className="h-label text-left px-4 py-3 font-normal w-[110px]">Дата</th>
            <th className="h-label text-left px-4 py-3 font-normal w-[150px]">Вид</th>
            <th className="h-label text-left px-4 py-3 font-normal w-[80px]">Кол-во</th>
            <th className="h-label text-left px-4 py-3 font-normal w-[160px]">Где</th>
            <th className="h-label text-left px-4 py-3 font-normal">Трофей</th>
            <th className="h-label text-left px-4 py-3 font-normal w-[90px]" />
          </tr>
        </thead>
        <tbody>
          {bag.map((b) => {
            const s = SPECIES_ONE(String(b.species));
            const l = locations.find((x) => String(x.id) === String(b.location_id));
            return (
              <tr
                key={String(b.id)}
                className="border-t border-[#e2e2df] hover:bg-[var(--hero-surface)] cursor-pointer"
                onClick={() => onEdit(b)}
              >
                <td className="px-4 py-3 text-[0.68em]">{String(b.taken_on || '').slice(0, 10)}</td>
                <td className="px-4 py-3 text-[0.72em]">
                  <span className="flex items-center gap-2">
                    <span className="text-[1.2em] leading-none">{s.emoji}</span>
                    {s.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-[0.72em]">{String(b.qty || 1)}</td>
                <td className="px-4 py-3 text-[0.68em]">{String(l?.name || b.place || '—')}</td>
                <td className="px-4 py-3 text-[0.72em]">{String(b.trophy_note || '—')}</td>
                <td className="px-4 py-3">
                  <button
                    className="h-label underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDrop(b);
                    }}
                  >
                    Убрать
                  </button>
                </td>
              </tr>
            );
          })}
          {!bag.length && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center h-mono-cap text-[var(--hero-muted)]">
                Трофеев пока нет — нажмите «Добавить трофей»
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </>
);

export default HunterBagTable;
