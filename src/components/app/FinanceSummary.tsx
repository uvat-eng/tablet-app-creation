import Icon from '@/components/ui/icon';
import { Row } from '@/lib/api';
import { KIND_LABEL, money } from '@/lib/expenses';

export const statBlock = (label: string, value: string, big = false) => (
  <div key={label} className="bg-white p-5">
    <div className="h-label">{label}</div>
    <div className={`h-head mt-2 whitespace-nowrap ${big ? 'text-[28px]' : 'text-[20px]'}`}>
      {value}
    </div>
  </div>
);

export interface IncomeTotals {
  total: number;
  licenses: number;
  stay: number;
  extras: number;
  discount: number;
  count: number;
}

interface Props {
  years: number[];
  season: number | 'all';
  setSeason: (v: number | 'all') => void;
  income: IncomeTotals;
  expenseTotal: number;
  profit: number;
  toAccount: number;
  leftOnFarm: number;
  splitRows: Row[];
  splitAccountCount: number;
  loading: boolean;
  onEdit: (row: Row) => void;
  onArchive: (id: number) => void;
}

const FinanceSummary = ({
  years,
  season,
  setSeason,
  income,
  expenseTotal,
  profit,
  toAccount,
  leftOnFarm,
  splitRows,
  splitAccountCount,
  loading,
  onEdit,
  onArchive,
}: Props) => (
  <>
    <div className="mb-8 flex flex-wrap items-center gap-2">
      <span className="h-label mr-1">Сезон</span>
      <button
        onClick={() => setSeason('all')}
        className="h-label px-2 py-1 border"
        style={{
          borderColor: '#e2e2df',
          background: season === 'all' ? 'var(--hero-accent)' : '#fff',
          color: season === 'all' ? 'var(--hero-accent-contrast)' : 'inherit',
        }}
      >
        За всё время
      </button>
      {years.map((y) => (
        <button
          key={y}
          onClick={() => setSeason(y)}
          className="h-label px-2 py-1 border"
          style={{
            borderColor: '#e2e2df',
            background: season === y ? 'var(--hero-accent)' : '#fff',
            color: season === y ? 'var(--hero-accent-contrast)' : 'inherit',
          }}
        >
          {y}
        </button>
      ))}
    </div>

    <div
      className="grid gap-px mb-10"
      style={{
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        background: '#e2e2df',
        border: '1px solid #e2e2df',
      }}
    >
      {statBlock('Поступления', money(income.total), true)}
      {statBlock('Расходы', money(expenseTotal), true)}
      {statBlock(profit >= 0 ? 'Прибыль' : 'Убыток', money(Math.abs(profit)), true)}
    </div>

    <div className="h-head text-[22px] mb-3">Распределение поступлений</div>
    <div
      className="grid gap-px mb-3"
      style={{
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        background: '#e2e2df',
        border: '1px solid #e2e2df',
      }}
    >
      {(() => {
        const base = income.total || 0;
        const cards = [
          {
            key: 'to_account',
            label: 'Отправлено на расчётный счёт',
            icon: 'Landmark',
            value: toAccount,
            hint: `${splitAccountCount} записей`,
            clickable: true,
          },
          {
            key: 'spent',
            label: 'Потрачено',
            icon: 'Receipt',
            value: expenseTotal,
            hint: 'Охота, безнал, прочие, объекты, локации',
            clickable: false,
          },
          {
            key: 'left',
            label: 'Оставлено на хозяйстве',
            icon: 'Home',
            value: leftOnFarm,
            hint: 'Поступления минус траты и перевод',
            clickable: false,
          },
        ];
        return cards.map((c) => {
          const share = base > 0 ? Math.round((c.value / base) * 100) : 0;
          const body = (
            <>
              <span className="flex items-center gap-2">
                <Icon name={c.icon} size={15} fallback="Circle" />
                <span className="h-label">{c.label}</span>
              </span>
              <div className="h-head text-[24px] mt-2 whitespace-nowrap">{money(c.value)}</div>
              <div className="h-mono-cap mt-2 text-[var(--hero-muted)]">
                {share}% от поступлений · {c.hint}
              </div>
              <div className="mt-3 h-[4px] bg-[#e2e2df]">
                <div
                  className="h-full"
                  style={{
                    width: `${Math.max(0, Math.min(share, 100))}%`,
                    background: 'var(--hero-accent)',
                  }}
                />
              </div>
            </>
          );
          return c.clickable ? (
            <button
              key={c.key}
              className="bg-white p-5 text-left hover:bg-[var(--hero-surface)] transition-colors"
              onClick={() => {
                onEdit({
                  kind: 'to_account',
                  qty: 1,
                  unit: 'шт',
                  name: 'Перевод на расчётный счёт',
                  spent_on: new Date().toISOString().slice(0, 10),
                } as Row);
              }}
            >
              {body}
            </button>
          ) : (
            <div key={c.key} className="bg-white p-5">
              {body}
            </div>
          );
        });
      })()}
    </div>

    {splitRows.length > 0 && (
      <div className="border border-[#e2e2df] overflow-x-auto mb-10">
        <table className="w-full min-w-[620px]">
          <thead>
            <tr className="bg-[var(--hero-surface)]">
              <th className="h-label text-left px-4 py-2 font-normal w-[110px]">Дата</th>
              <th className="h-label text-left px-4 py-2 font-normal w-[230px]">Направление</th>
              <th className="h-label text-left px-4 py-2 font-normal">Назначение</th>
              <th className="h-label text-left px-4 py-2 font-normal w-[130px]">Сумма</th>
              <th className="h-label text-left px-4 py-2 font-normal w-[100px]" />
            </tr>
          </thead>
          <tbody>
            {splitRows.map((r) => (
              <tr
                key={String(r.id)}
                className="border-t border-[#e2e2df] hover:bg-[var(--hero-surface)] cursor-pointer"
                onClick={() => onEdit(r)}
              >
                <td className="px-4 py-2 text-[0.68em]">{String(r.spent_on || '').slice(0, 10)}</td>
                <td className="px-4 py-2 text-[0.68em]">{KIND_LABEL(String(r.kind))}</td>
                <td className="px-4 py-2 text-[0.72em]">{String(r.name)}</td>
                <td className="px-4 py-2 text-[0.72em] whitespace-nowrap">{money(r.total)}</td>
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
          </tbody>
        </table>
      </div>
    )}

    <div className="h-head text-[22px] mb-3">Поступления</div>
    <div
      className="grid gap-px mb-3"
      style={{
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        background: '#e2e2df',
        border: '1px solid #e2e2df',
      }}
    >
      {statBlock('Итого по актам', money(income.total))}
      {statBlock('в т.ч. лицензии', money(income.licenses))}
      {statBlock('в т.ч. размещение', money(income.stay))}
      {statBlock('в т.ч. доп. услуги', money(income.extras))}
      {statBlock('Скидки', money(income.discount))}
    </div>
    <div className="h-label mb-8">
      {loading ? 'Загружаем…' : `${income.count} актов в выбранном периоде`}
    </div>
  </>
);

export default FinanceSummary;
