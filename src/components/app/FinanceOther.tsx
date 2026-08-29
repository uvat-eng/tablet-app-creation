import Icon from '@/components/ui/icon';
import { Row } from '@/lib/api';
import { money } from '@/lib/expenses';
import ReceiptLink from '@/components/app/ReceiptLink';
import { SECTION_LABEL, SOURCE_LABEL } from '@/lib/transfers';

interface Props {
  transfersTotal: number;
  seasonTransfers: Row[];
  otherKinds: { key: string; label: string; icon: string }[];
  otherByKind: Record<string, { sum: number; rows: Row[] }>;
  navigate: (to: string) => void;
  onEdit: (row: Row) => void;
  onArchive: (id: number) => void;
}

const FinanceOther = ({
  transfersTotal,
  seasonTransfers,
  otherKinds,
  otherByKind,
  navigate,
  onEdit,
  onArchive,
}: Props) => (
  <>
    <div className="h-head text-[22px] mb-3">Прочие расходы</div>
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-2">
          <Icon name="ArrowLeftRight" size={15} fallback="Circle" />
          <span className="h-label">Переводы и траты с личных карт</span>
        </span>
        <span className="h-head text-[18px]">{money(transfersTotal)}</span>
      </div>
      <div className="border border-[#e2e2df] overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="bg-[var(--hero-surface)]">
              <th className="h-label text-left px-4 py-2 font-normal w-[110px]">Дата</th>
              <th className="h-label text-left px-4 py-2 font-normal">Назначение</th>
              <th className="h-label text-left px-4 py-2 font-normal w-[150px]">Источник</th>
              <th className="h-label text-left px-4 py-2 font-normal w-[160px]">Раздел</th>
              <th className="h-label text-left px-4 py-2 font-normal w-[130px]">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {seasonTransfers.map((r) => (
              <tr
                key={String(r.id)}
                className="border-t border-[#e2e2df] hover:bg-[var(--hero-surface)] cursor-pointer"
                onClick={() => navigate('/transfers')}
              >
                <td className="px-4 py-2 text-[0.68em]">
                  {String(r.spent_on || '').slice(0, 10)}
                </td>
                <td className="px-4 py-2 text-[0.72em]">
                  {String(r.name || '')}
                  {r.receipt_url && (
                    <span className="block mt-1">
                      <ReceiptLink url={r.receipt_url} />
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-[0.68em]">{SOURCE_LABEL(String(r.source))}</td>
                <td className="px-4 py-2 text-[0.68em]">
                  {r.section ? SECTION_LABEL(String(r.section)) : 'без привязки'}
                </td>
                <td className="px-4 py-2 text-[0.72em] whitespace-nowrap">{money(r.amount)}</td>
              </tr>
            ))}
            {!seasonTransfers.length && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center h-mono-cap text-[var(--hero-muted)]"
                >
                  Переводы вносятся в разделе «Финансы переводы»
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

    <div className="grid gap-6 mb-10">
      {otherKinds.map((k) => {
        const data = otherByKind[k.key] || { sum: 0, rows: [] };
        return (
          <div key={k.key}>
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2">
                <Icon name={k.icon} size={15} fallback="Circle" />
                <span className="h-label">{k.label}</span>
              </span>
              <span className="h-head text-[18px]">{money(data.sum)}</span>
            </div>
            <div className="border border-[#e2e2df] overflow-x-auto">
              <table className="w-full min-w-[620px]">
                <thead>
                  <tr className="bg-[var(--hero-surface)]">
                    <th className="h-label text-left px-4 py-2 font-normal w-[110px]">Дата</th>
                    <th className="h-label text-left px-4 py-2 font-normal">Наименование</th>
                    <th className="h-label text-left px-4 py-2 font-normal w-[150px]">Кому / где</th>
                    <th className="h-label text-left px-4 py-2 font-normal w-[130px]">Сумма</th>
                    <th className="h-label text-left px-4 py-2 font-normal w-[100px]" />
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr
                      key={String(r.id)}
                      className="border-t border-[#e2e2df] hover:bg-[var(--hero-surface)] cursor-pointer"
                      onClick={() => onEdit(r)}
                    >
                      <td className="px-4 py-2 text-[0.68em]">
                        {String(r.spent_on || '').slice(0, 10)}
                      </td>
                      <td className="px-4 py-2 text-[0.72em]">
                        {String(r.name)}
                        {r.receipt_url && (
                          <span className="block mt-1">
                            <ReceiptLink url={r.receipt_url} />
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-[0.68em]">{String(r.vendor || '—')}</td>
                      <td className="px-4 py-2 text-[0.72em] whitespace-nowrap">
                        {money(r.total)}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          className="h-label underline"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await onArchive(Number(r.id));
                          }}
                        >
                          В архив
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!data.rows.length && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center h-mono-cap text-[var(--hero-muted)]"
                      >
                        Записей нет
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  </>
);

export default FinanceOther;