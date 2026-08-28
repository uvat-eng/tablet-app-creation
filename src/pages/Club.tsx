import { useCallback } from 'react';
import CrudPage from '@/components/app/CrudPage';
import { Row } from '@/lib/api';

const Club = () => {
  const onlyMembers = useCallback((r: Row) => Boolean(r.club_member), []);

  return (
    <CrudPage
      table="guests"
      index="Раздел / Закрытый клуб охотников"
      title="Закрытый клуб охотников"
      lede="Члены клуба: контакты, срок членства, взносы и привилегии."
      addLabel="Добавить члена клуба"
      searchKeys={['name', 'phone', 'city', 'note']}
      rowLink={(r) => `/club/${r.id}`}
      filter={onlyMembers}
      defaults={{ club_member: true }}
      columns={[
        { key: 'name', label: 'Имя' },
        { key: 'phone', label: 'Телефон', width: '170px' },
        { key: 'city', label: 'Город', width: '140px' },
        { key: 'club_until', label: 'Членство до', width: '130px' },
        { key: 'note', label: 'Заметка' },
      ]}
      fields={[
        { key: 'name', label: 'Имя и фамилия' },
        { key: 'phone', label: 'Телефон' },
        { key: 'city', label: 'Город' },
        { key: 'club_member', label: 'Член клуба', type: 'checkbox' },
        { key: 'club_until', label: 'Членство до', type: 'date' },
        { key: 'note', label: 'Заметка', type: 'textarea' },
      ]}
      extra={(rows: Row[]) => {
        const year = new Date().getFullYear();
        const active = rows.filter(
          (r) => !r.club_until || String(r.club_until).slice(0, 4) >= String(year),
        ).length;
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
              <div className="h-label">Членов клуба</div>
              <div className="h-head text-[26px] mt-2">{rows.length}</div>
            </div>
            <div className="bg-white p-5">
              <div className="h-label">Действующих в {year}</div>
              <div className="h-head text-[26px] mt-2">{active}</div>
            </div>
            <div className="bg-white p-5">
              <div className="h-label">Свободных мест</div>
              <div className="h-head text-[26px] mt-2">{Math.max(0, 24 - rows.length)}</div>
            </div>
          </div>
        );
      }}
    />
  );
};

export default Club;
