import { useCallback } from 'react';
import CrudPage from '@/components/app/CrudPage';
import { Row } from '@/lib/api';

const Hunters = () => {
  const notMembers = useCallback((r: Row) => !r.club_member, []);

  return (
    <CrudPage
      table="guests"
      index="Раздел / База охотников"
      title="База охотников"
      lede="Все охотники и гости хозяйства, кроме членов закрытого клуба."
      addLabel="Добавить охотника"
      searchKeys={['name', 'phone', 'city', 'note']}
      rowLink={(r) => `/hunters/${r.id}`}
      filter={notMembers}
      columns={[
        { key: 'name', label: 'Имя' },
        { key: 'phone', label: 'Телефон', width: '170px' },
        { key: 'city', label: 'Город', width: '140px' },
        { key: 'note', label: 'Заметка' },
      ]}
      fields={[
        { key: 'name', label: 'Имя и фамилия' },
        { key: 'phone', label: 'Телефон' },
        { key: 'city', label: 'Город' },
        { key: 'club_member', label: 'Принять в закрытый клуб', type: 'checkbox' },
        { key: 'club_until', label: 'Членство до', type: 'date' },
        { key: 'note', label: 'Заметка', type: 'textarea' },
      ]}
      extra={(rows: Row[]) => {
        const withPhone = rows.filter((r) => String(r.phone || '').trim()).length;
        const cities = new Set(
          rows.map((r) => String(r.city || '').trim()).filter(Boolean),
        ).size;
        return (
          <div
            className="grid gap-px"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              background: '#e2e2df',
              border: '1px solid #e2e2df',
            }}
          >
            <div className="bg-white p-5">
              <div className="h-label">Всего охотников</div>
              <div className="h-head text-[26px] mt-2">{rows.length}</div>
            </div>
            <div className="bg-white p-5">
              <div className="h-label">С телефоном</div>
              <div className="h-head text-[26px] mt-2">{withPhone}</div>
            </div>
            <div className="bg-white p-5">
              <div className="h-label">Городов</div>
              <div className="h-head text-[26px] mt-2">{cities}</div>
            </div>
          </div>
        );
      }}
    />
  );
};

export default Hunters;
