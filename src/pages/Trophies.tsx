import CrudPage from '@/components/app/CrudPage';

const Trophies = () => (
  <CrudPage
    table="trophies"
    index="07 / Журнал добычи"
    title="Трофейный зал"
    lede="Учёт добытых трофеев: вид, дата, охотник, угодье."
    addLabel="Записать трофей"
    columns={[
      { key: 'species', label: 'Вид', width: '140px' },
      { key: 'taken_on', label: 'Дата', width: '120px' },
      { key: 'hunter', label: 'Охотник' },
      { key: 'location', label: 'Угодье' },
      { key: 'weight', label: 'Вес', width: '100px' },
      { key: 'note', label: 'Заметка' },
    ]}
    fields={[
      { key: 'species', label: 'Вид зверя или птицы' },
      { key: 'taken_on', label: 'Дата добычи', type: 'date' },
      { key: 'hunter', label: 'Охотник' },
      { key: 'location', label: 'Угодье' },
      { key: 'weight', label: 'Вес или размер' },
      { key: 'note', label: 'Заметка', type: 'textarea' },
      { key: 'photo_url', label: 'Ссылка на фото' },
    ]}
  />
);

export default Trophies;
