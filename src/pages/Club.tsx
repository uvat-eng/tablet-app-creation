import CrudPage from '@/components/app/CrudPage';
import { Row } from '@/lib/api';

const Club = () => (
  <CrudPage
    table="guests"
    index="10 / База гостей"
    title="Клуб охотников"
    lede="Гости хозяйства и члены клуба: контакты, статус, срок членства."
    addLabel="Добавить гостя"
    columns={[
      { key: 'name', label: 'Имя' },
      { key: 'phone', label: 'Телефон', width: '170px' },
      { key: 'city', label: 'Город', width: '140px' },
      {
        key: 'club_member',
        label: 'Клуб',
        width: '110px',
        render: (r) =>
          r.club_member ? <span className="h-chip h-chip-mark text-[0.9em]">Член клуба</span> : 'Гость',
      },
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
      const members = rows.filter((r) => r.club_member).length;
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
            <div className="h-label">Всего гостей</div>
            <div className="h-head text-[26px] mt-2">{rows.length}</div>
          </div>
          <div className="bg-white p-5">
            <div className="h-label">Членов клуба</div>
            <div className="h-head text-[26px] mt-2">{members}</div>
          </div>
          <div className="bg-white p-5">
            <div className="h-label">Свободных мест в клубе</div>
            <div className="h-head text-[26px] mt-2">{Math.max(0, 24 - members)}</div>
          </div>
        </div>
      );
    }}
  />
);

export default Club;
