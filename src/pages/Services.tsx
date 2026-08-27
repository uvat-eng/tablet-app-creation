import CrudPage from '@/components/app/CrudPage';

const Services = () => (
  <CrudPage
    table="services"
    index="Раздел / Услуги"
    title="Услуги"
    lede="Прайс хозяйства: охота, лицензии, питание, дополнительные услуги."
    addLabel="Добавить услугу"
    columns={[
      { key: 'name', label: 'Услуга' },
      { key: 'category', label: 'Категория', width: '150px' },
      { key: 'price', label: 'Цена', width: '120px', render: (r) => `${Number(r.price || 0).toLocaleString('ru-RU')} ₽` },
      { key: 'unit', label: 'Ед.', width: '90px' },
      { key: 'note', label: 'Описание' },
    ]}
    fields={[
      { key: 'name', label: 'Название' },
      { key: 'category', label: 'Категория', placeholder: 'Охота, Быт, Доп' },
      { key: 'price', label: 'Цена, ₽', type: 'number' },
      { key: 'unit', label: 'Единица', placeholder: 'день / шт / выезд' },
      { key: 'note', label: 'Описание', type: 'textarea' },
    ]}
  />
);

export default Services;
