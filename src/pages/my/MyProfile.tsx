import { useCallback, useEffect, useState } from 'react';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import RecordDialog, { Field } from '@/components/app/RecordDialog';
import { Row, listRows, updateRow } from '@/lib/api';
import { COUNTRIES } from '@/lib/countries';
import { toast } from 'sonner';

const FIELDS: Field[] = [
  { key: 'name', label: 'ФИО полностью' },
  {
    key: 'country',
    label: 'Страна',
    type: 'select',
    options: COUNTRIES.map((c) => ({ value: c.name, label: `${c.flag} ${c.name}` })),
  },
  { key: 'nationality', label: 'Национальность' },
  { key: 'city', label: 'Город проживания' },
  { key: 'phone', label: 'Телефон' },
  { key: 'email', label: 'Электронная почта' },
  { key: 'inn', label: 'ИНН' },
  { key: 'snils', label: 'СНИЛС' },
  { key: 'born_on', label: 'Дата рождения', type: 'date' },
  { key: 'passport', label: 'Паспорт: серия и номер' },
  { key: 'passport_date', label: 'Паспорт: дата выдачи', type: 'date' },
  { key: 'passport_issued', label: 'Паспорт: кем выдан' },
  { key: 'address', label: 'Прописка' },
  { key: 'hunt_ticket', label: 'Охотничий билет: номер' },
  { key: 'hunt_ticket_date', label: 'Охотбилет: дата выдачи', type: 'date' },
  { key: 'hunt_ticket_issued', label: 'Охотбилет: кем выдан' },
  { key: 'roh_number', label: 'РОХа: номер' },
  { key: 'roh_date', label: 'РОХа: действует до', type: 'date' },
  { key: 'roh_weapon', label: 'Оружие по РОХе' },
];

const LINES: { key: string; label: string; date?: boolean }[] = [
  { key: 'name', label: 'ФИО' },
  { key: 'phone', label: 'Телефон' },
  { key: 'email', label: 'Почта' },
  { key: 'city', label: 'Город' },
  { key: 'born_on', label: 'Дата рождения', date: true },
  { key: 'country', label: 'Гражданство' },
  { key: 'nationality', label: 'Национальность' },
  { key: 'passport', label: 'Паспорт' },
  { key: 'passport_date', label: 'Паспорт выдан', date: true },
  { key: 'passport_issued', label: 'Паспорт: кем выдан' },
  { key: 'address', label: 'Прописка' },
  { key: 'hunt_ticket', label: 'Охотбилет' },
  { key: 'hunt_ticket_date', label: 'Охотбилет выдан', date: true },
  { key: 'hunt_ticket_issued', label: 'Охотбилет: кем выдан' },
  { key: 'roh_number', label: 'РОХа' },
  { key: 'roh_date', label: 'РОХа до', date: true },
  { key: 'roh_weapon', label: 'Оружие' },
];

const MyProfile = () => {
  const [me, setMe] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await listRows('guests');
    setMe(list[0] || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (values: Row) => {
    if (!me?.id) return;
    const payload: Row = { ...values, id: me.id };
    ['born_on', 'passport_date', 'hunt_ticket_date', 'roh_date'].forEach((k) => {
      payload[k] = String(values[k] || '').slice(0, 10) || null;
    });
    try {
      await updateRow('guests', payload);
      toast.success('Данные сохранены');
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось сохранить');
    }
  };

  const value = (l: { key: string; date?: boolean }) => {
    const raw = me?.[l.key];
    if (!raw) return '—';
    return l.date ? String(raw).slice(0, 10) : String(raw);
  };

  const filled = LINES.filter((l) => me?.[l.key]).length;

  return (
    <Layout
      index="Кабинет / Личные данные"
      title="Мои данные"
      lede="Паспорт, охотбилет и РОХа — нужны хозяйству для договора и путёвок."
      action={
        me ? (
          <button className="h-cta" onClick={() => setOpen(true)}>
            <Icon name="Pencil" size={15} /> Заполнить данные
          </button>
        ) : undefined
      }
    >
      {!me && !loading && (
        <div className="border border-[#e2e2df] p-10 text-center h-mono-cap text-[var(--hero-muted)]">
          Ваш доступ не привязан к карточке. Обратитесь к хозяйству.
        </div>
      )}

      {me && (
        <>
          <div className="h-label mb-4">
            Заполнено {filled} из {LINES.length} полей
          </div>
          <div className="border border-[#e2e2df]">
            {LINES.map((l, i) => (
              <div
                key={l.key}
                className="flex flex-wrap gap-2 justify-between px-4 py-3"
                style={{ borderTop: i ? '1px solid #e2e2df' : 'none' }}
              >
                <span className="h-label">{l.label}</span>
                <span className="text-[0.75em]">{value(l)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title="Мои данные"
        fields={FIELDS}
        initial={me}
        onSubmit={save}
      />
    </Layout>
  );
};

export default MyProfile;