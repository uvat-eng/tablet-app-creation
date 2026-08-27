import CrudPage from '@/components/app/CrudPage';

const Reviews = () => (
  <CrudPage
    table="reviews"
    index="Раздел / Отзывы"
    title="Отзывы"
    lede="Отзывы гостей: оценка, текст, публикация на сайте."
    addLabel="Добавить отзыв"
    columns={[
      { key: 'author', label: 'Автор', width: '160px' },
      { key: 'city', label: 'Город', width: '130px' },
      { key: 'rating', label: 'Оценка', width: '90px' },
      { key: 'text', label: 'Текст' },
      {
        key: 'published',
        label: 'На сайте',
        width: '110px',
        render: (r) => (r.published ? 'Да' : 'Нет'),
      },
    ]}
    fields={[
      { key: 'author', label: 'Автор' },
      { key: 'city', label: 'Город' },
      { key: 'rating', label: 'Оценка 1–5', type: 'number' },
      { key: 'text', label: 'Текст отзыва', type: 'textarea' },
      { key: 'published', label: 'Публиковать', type: 'checkbox' },
    ]}
  />
);

export default Reviews;
