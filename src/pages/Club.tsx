import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import CrudPage from '@/components/app/CrudPage';
import Icon from '@/components/ui/icon';
import { Row } from '@/lib/api';
import { money } from '@/lib/expenses';

const FEE = 6500;

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
        { key: 'contract_no', label: 'Договор', width: '100px' },
        { key: 'name', label: 'Имя' },
        { key: 'cert_type', label: 'Статус', width: '110px' },
        { key: 'phone', label: 'Телефон', width: '150px' },
        { key: 'city', label: 'Город', width: '130px' },
        {
          key: 'born_on',
          label: 'Год рожд.',
          width: '100px',
          render: (r) => String(r.born_on || '').slice(0, 4) || '—',
        },
      ]}
      fields={[
        { key: 'name', label: 'ФИО полностью' },
        { key: 'born_on', label: 'Дата рождения', type: 'date' },
        { key: 'passport', label: 'Паспорт: серия и номер' },
        { key: 'passport_date', label: 'Паспорт: дата выдачи', type: 'date' },
        { key: 'address', label: 'Прописка' },
        { key: 'phone', label: 'Телефон' },
        { key: 'city', label: 'Город' },
        { key: 'contract_no', label: 'Номер договора' },
        {
          key: 'cert_type',
          label: 'Удостоверение',
          type: 'select',
          options: [
            { value: 'охотник', label: 'Охотник' },
            { value: 'инспектор', label: 'Инспектор' },
          ],
        },
        { key: 'fee_monthly', label: 'Взнос в месяц, ₽', type: 'number' },
        { key: 'club_member', label: 'Член клуба', type: 'checkbox' },
        { key: 'club_until', label: 'Членство до', type: 'date' },
        { key: 'note', label: 'Заметка', type: 'textarea' },
      ]}
      extra={(rows: Row[]) => {
        const year = new Date().getFullYear();
        const planYear = rows.length * FEE * 12;
        return (
          <>
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
                <div className="h-label">Взнос в месяц</div>
                <div className="h-head text-[26px] mt-2">{money(FEE)}</div>
              </div>
              <div className="bg-white p-5">
                <div className="h-label">План взносов на {year}</div>
                <div className="h-head text-[26px] mt-2">{money(planYear)}</div>
              </div>
              <div className="bg-white p-5">
                <div className="h-label">Свободных мест</div>
                <div className="h-head text-[26px] mt-2">{Math.max(0, 24 - rows.length)}</div>
              </div>
            </div>

            <div className="mt-4">
              <Link className="h-cta-ghost inline-flex" to="/club/fees">
                <Icon name="Table" size={14} /> Журнал учёта взносов
              </Link>
            </div>
          </>
        );
      }}
    />
  );
};

export default Club;