import CrudPage from '@/components/app/CrudPage';

const Locations = () => (
  <CrudPage
    table="locations"
    index="08 / Угодья"
    title="Локации"
    lede="Закреплённые угодья: площадь, удалённость, что водится."
    addLabel="Добавить угодье"
    columns={[
      { key: 'name', label: 'Название' },
      { key: 'distance_km', label: 'Км от базы', width: '130px' },
      { key: 'area_ha', label: 'Площадь, га', width: '130px' },
      { key: 'species', label: 'Виды' },
      { key: 'note', label: 'Заметка' },
    ]}
    fields={[
      { key: 'name', label: 'Название угодья' },
      { key: 'distance_km', label: 'Расстояние, км', type: 'number' },
      { key: 'area_ha', label: 'Площадь, га', type: 'number' },
      { key: 'species', label: 'Виды', placeholder: 'Лось, кабан' },
      { key: 'note', label: 'Заметка', type: 'textarea' },
    ]}
  />
);

export default Locations;
