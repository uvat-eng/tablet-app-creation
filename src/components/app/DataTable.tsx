import { Row } from '@/lib/api';

export interface Column {
  key: string;
  label: string;
  width?: string;
  render?: (row: Row) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  rows: Row[];
  empty?: string;
  onRowClick?: (row: Row) => void;
}

const DataTable = ({ columns, rows, empty = 'Пока пусто', onRowClick }: DataTableProps) => {
  if (!rows.length) {
    return (
      <div className="border border-[#e2e2df] p-8 text-center h-mono-cap text-[var(--hero-muted)]">
        {empty}
      </div>
    );
  }

  return (
    <div className="border border-[#e2e2df] overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr className="bg-[var(--hero-surface)]">
            {columns.map((c) => (
              <th
                key={c.key}
                className="h-label text-left px-4 py-3 font-normal"
                style={{ width: c.width }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={String(r.id)}
              onClick={() => onRowClick?.(r)}
              className={`border-t border-[#e2e2df] ${onRowClick ? 'cursor-pointer hover:bg-[var(--hero-surface)]' : ''}`}
            >
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3 text-[0.72em] align-top">
                  {c.render ? c.render(r) : (r[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
