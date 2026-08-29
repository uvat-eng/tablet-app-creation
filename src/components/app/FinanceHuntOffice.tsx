import Icon from '@/components/ui/icon';
import { Row } from '@/lib/api';
import {
  HUNT_CATEGORIES,
  HUNT_CATEGORY_LABEL,
  OFFICE_CATEGORIES,
  OFFICE_CATEGORY_LABEL,
  money,
} from '@/lib/expenses';
import { statBlock } from '@/components/app/FinanceSummary';

interface Props {
  huntByCategory: Record<string, number>;
  huntTotal: number;
  huntExpenses: Row[];
  officeByCategory: Record<string, number>;
  officeTotal: number;
  seasonOffice: Row[];
  navigate: (to: string) => void;
}

const FinanceHuntOffice = ({
  huntByCategory,
  huntTotal,
  huntExpenses,
  officeByCategory,
  officeTotal,
  seasonOffice,
  navigate,
}: Props) => (
  <>
    <div className="h-head text-[22px] mb-3">Расходы на проведение охоты</div>
    <div
      className="grid gap-px mb-3"
      style={{
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        background: '#e2e2df',
        border: '1px solid #e2e2df',
      }}
    >
      {HUNT_CATEGORIES.map((c) => statBlock(c.label, money(huntByCategory[c.key] || 0)))}
      {statBlock('Итого', money(huntTotal))}
    </div>

    <div className="border border-[#e2e2df] overflow-x-auto mb-10">
      <table className="w-full min-w-[720px]">
        <thead>
          <tr className="bg-[var(--hero-surface)]">
            <th className="h-label text-left px-4 py-3 font-normal w-[110px]">Дата</th>
            <th className="h-label text-left px-4 py-3 font-normal w-[150px]">Статья</th>
            <th className="h-label text-left px-4 py-3 font-normal">Наименование</th>
            <th className="h-label text-left px-4 py-3 font-normal w-[110px]">Акт</th>
            <th className="h-label text-left px-4 py-3 font-normal w-[130px]">Сумма</th>
          </tr>
        </thead>
        <tbody>
          {huntExpenses.slice(0, 15).map((e) => (
            <tr
              key={String(e.id)}
              className="border-t border-[#e2e2df] hover:bg-[var(--hero-surface)] cursor-pointer"
              onClick={() => navigate(`/documents/expenses/${e.check_id}`)}
            >
              <td className="px-4 py-3 text-[0.68em]">{String(e.spent_on || '').slice(0, 10)}</td>
              <td className="px-4 py-3 text-[0.68em]">
                {HUNT_CATEGORY_LABEL(String(e.category))}
              </td>
              <td className="px-4 py-3 text-[0.72em]">{String(e.name)}</td>
              <td className="px-4 py-3 text-[0.68em]">№ {String(e.check_id || '—')}</td>
              <td className="px-4 py-3 text-[0.72em] whitespace-nowrap">{money(e.total)}</td>
            </tr>
          ))}
          {!huntExpenses.length && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center h-mono-cap text-[var(--hero-muted)]">
                Расходы вносятся в акте о расходах после каждой охоты
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    <div className="flex items-end justify-between mb-3 gap-4 flex-wrap">
      <span className="h-head text-[22px]">Расходы безнал</span>
      <button className="h-cta-ghost" onClick={() => navigate('/office')}>
        <Icon name="Landmark" size={14} /> Вести в разделе «Финансы ОФИС»
      </button>
    </div>
    <div
      className="grid gap-px mb-3"
      style={{
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        background: '#e2e2df',
        border: '1px solid #e2e2df',
      }}
    >
      {OFFICE_CATEGORIES.map((c) => statBlock(c.label, money(officeByCategory[c.key] || 0)))}
      {statBlock('Итого', money(officeTotal))}
    </div>

    <div className="border border-[#e2e2df] overflow-x-auto mb-10">
      <table className="w-full min-w-[760px]">
        <thead>
          <tr className="bg-[var(--hero-surface)]">
            <th className="h-label text-left px-4 py-3 font-normal w-[110px]">Дата</th>
            <th className="h-label text-left px-4 py-3 font-normal w-[160px]">Статья</th>
            <th className="h-label text-left px-4 py-3 font-normal">Наименование</th>
            <th className="h-label text-left px-4 py-3 font-normal w-[140px]">Период</th>
            <th className="h-label text-left px-4 py-3 font-normal w-[130px]">Сумма</th>
          </tr>
        </thead>
        <tbody>
          {seasonOffice.slice(0, 15).map((r) => (
            <tr
              key={String(r.id)}
              className="border-t border-[#e2e2df] hover:bg-[var(--hero-surface)] cursor-pointer"
              onClick={() => navigate('/office')}
            >
              <td className="px-4 py-3 text-[0.68em]">{String(r.spent_on || '').slice(0, 10)}</td>
              <td className="px-4 py-3 text-[0.68em]">
                {OFFICE_CATEGORY_LABEL(String(r.category))}
              </td>
              <td className="px-4 py-3 text-[0.72em]">{String(r.name || '—')}</td>
              <td className="px-4 py-3 text-[0.68em]">{String(r.period || '—')}</td>
              <td className="px-4 py-3 text-[0.72em] whitespace-nowrap">{money(r.amount)}</td>
            </tr>
          ))}
          {!seasonOffice.length && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center h-mono-cap text-[var(--hero-muted)]">
                Зарплата, налоги, свет и аренда вносятся в разделе «Финансы ОФИС»
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </>
);

export default FinanceHuntOffice;
