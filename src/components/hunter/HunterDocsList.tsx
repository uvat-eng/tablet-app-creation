import Icon from '@/components/ui/icon';
import { Row } from '@/lib/api';

interface Props {
  docs: Row[];
  onAdd: () => void;
  onEdit: (d: Row) => void;
}

const HunterDocsList = ({ docs, onAdd, onEdit }: Props) => (
  <>
    <div className="flex flex-wrap items-center gap-3 mb-3">
      <div className="h-head text-[22px]">Документы</div>
      <button className="h-cta-ghost" onClick={onAdd}>
        <Icon name="Plus" size={14} /> Добавить документ
      </button>
    </div>
    <div className="border border-[#e2e2df] mb-10">
      {docs.map((d) => (
        <div
          key={String(d.id)}
          className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-[#eeeeec] last:border-0"
        >
          <Icon name="FileText" size={15} className="opacity-60" />
          <span className="text-[0.74em]">{String(d.title || 'Документ')}</span>
          {d.doc_no && <span className="h-label">№ {String(d.doc_no)}</span>}
          {d.signed_on && (
            <span className="h-label">
              от {String(d.signed_on).slice(0, 10).split('-').reverse().join('.')}
            </span>
          )}
          <span className="flex gap-2 ml-auto">
            {d.file_url && (
              <a className="h-cta-ghost" href={String(d.file_url)} target="_blank" rel="noreferrer">
                <Icon name="Download" size={13} /> Открыть
              </a>
            )}
            <button className="h-label underline" onClick={() => onEdit(d)}>
              Изменить
            </button>
          </span>
        </div>
      ))}
      {!docs.length && (
        <div className="px-4 py-6 text-center h-mono-cap text-[var(--hero-muted)]">
          Документов пока нет
        </div>
      )}
    </div>
  </>
);

export default HunterDocsList;
