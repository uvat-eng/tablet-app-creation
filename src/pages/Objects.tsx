import CrudPage from '@/components/app/CrudPage';
import { Row } from '@/lib/api';

const money = (r: Row) => `${Number(r.price || 0).toLocaleString('ru-RU')} ₽`;

const columns = [
  {
    key: 'photo_url',
    label: 'Фото',
    width: '80px',
    render: (r: Row) =>
      r.photo_url ? (
        <img src={String(r.photo_url)} alt="" className="w-14 h-10 object-cover" />
      ) : (
        '—'
      ),
  },
  { key: 'name', label: 'Название' },
  { key: 'capacity', label: 'Вместимость', width: '130px' },
  { key: 'price', label: 'Цена', width: '120px', render: money },
  { key: 'note', label: 'Описание' },
  { key: 'status', label: 'Статус', width: '110px' },
];

const makeFields = (kind: string) => [
  { key: 'name', label: 'Название' },
  { key: 'capacity', label: 'Вместимость, чел.', type: 'number' as const },
  { key: 'price', label: 'Цена, ₽', type: 'number' as const },
  { key: 'note', label: 'Описание', type: 'textarea' as const },
  {
    key: 'status',
    label: 'Статус',
    type: 'select' as const,
    options: [
      { value: 'active', label: 'В работе' },
      { value: 'repair', label: 'На ремонте' },
      { value: 'off', label: 'Не используется' },
    ],
  },
  { key: 'kind', label: 'Тип', type: 'text' as const, placeholder: kind },
  { key: 'photo_url', label: 'Фотография', type: 'photo' as const, folder: 'objects' },
];

const filterTransport = (r: Row) => r.kind === 'transport';
const filterHouse = (r: Row) => r.kind === 'house';
const filterHotel = (r: Row) => r.kind === 'hotel';
const filterBanya = (r: Row) => r.kind === 'banya';

export const Transport = () => (
  <CrudPage
    table="objects"
    index="Раздел / Транспорт"
    title="Транспорт"
    lede="Снегоходы, вездеходы, лодки: состояние и стоимость аренды."
    addLabel="Добавить технику"
    columns={columns}
    fields={makeFields('transport')}
    filter={filterTransport}
    defaults={{ kind: 'transport' }}
  />
);

export const House = () => (
  <CrudPage
    table="objects"
    index="Раздел / Дом"
    title="Дом"
    lede="Охотничьи дома: вместимость, суточная стоимость, состояние."
    addLabel="Добавить дом"
    columns={columns}
    fields={makeFields('house')}
    filter={filterHouse}
    defaults={{ kind: 'house' }}
  />
);

export const Hotel = () => (
  <CrudPage
    table="objects"
    index="Раздел / Гостиница"
    title="Гостиница"
    lede="Номерной фонд базы."
    addLabel="Добавить номер"
    columns={columns}
    fields={makeFields('hotel')}
    filter={filterHotel}
    defaults={{ kind: 'hotel' }}
  />
);

export const Banya = () => (
  <CrudPage
    table="objects"
    index="Раздел / Баня"
    title="Баня"
    lede="Парные и комнаты отдыха: почасовая стоимость и загрузка."
    addLabel="Добавить баню"
    columns={columns}
    fields={makeFields('banya')}
    filter={filterBanya}
    defaults={{ kind: 'banya' }}
  />
);