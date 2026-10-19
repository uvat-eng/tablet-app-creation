import { Row } from '@/lib/api';

const HunterBookings = ({ bookings }: { bookings: Row[] }) => {
  if (bookings.length === 0) return null;
  return (
    <>
      <div className="h-head text-[22px] mt-10 mb-3">Заезды</div>
      <div className="border border-[#e2e2df] overflow-x-auto">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr className="bg-[var(--hero-surface)]">
              <th className="h-label text-left px-4 py-2 font-normal w-[120px]">Заезд</th>
              <th className="h-label text-left px-4 py-2 font-normal w-[120px]">Выезд</th>
              <th className="h-label text-left px-4 py-2 font-normal">Объект</th>
              <th className="h-label text-left px-4 py-2 font-normal w-[80px]">Чел.</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={String(b.id)} className="border-t border-[#e2e2df]">
                <td className="px-4 py-2 text-[0.68em]">{String(b.date_from || '')}</td>
                <td className="px-4 py-2 text-[0.68em]">{String(b.date_to || '')}</td>
                <td className="px-4 py-2 text-[0.72em]">{String(b.object_name || '—')}</td>
                <td className="px-4 py-2 text-[0.72em]">{String(b.people || '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default HunterBookings;
