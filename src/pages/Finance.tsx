import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/app/Layout';
import RecordDialog, { Field } from '@/components/app/RecordDialog';
import { Row, listRows, createRow, updateRow, removeRow } from '@/lib/api';
import {
  EXPENSE_KINDS,
  SPLIT_KINDS,
  HUNT_CATEGORIES,
  OFFICE_CATEGORIES,
  RECEIPT_FIELD,
} from '@/lib/expenses';
import { FACILITIES } from '@/lib/houseCategories';
import { LOCATION_KINDS } from '@/lib/locationKinds';
import FinanceSummary from '@/components/app/FinanceSummary';
import FinanceHuntOffice from '@/components/app/FinanceHuntOffice';
import FinanceOther from '@/components/app/FinanceOther';
import FinanceFacilities from '@/components/app/FinanceFacilities';
import { toast } from 'sonner';

const OTHER_KINDS = EXPENSE_KINDS.filter((k) => k.key !== 'hunt');
const SPLIT_KEYS = [...SPLIT_KINDS.map((k) => k.key), 'to_farm'];

const FIELDS: Field[] = [
  { key: 'name', label: 'Наименование' },
  {
    key: 'kind',
    label: 'Раздел расходов',
    type: 'select',
    options: [...OTHER_KINDS, ...SPLIT_KINDS].map((k) => ({ value: k.key, label: k.label })),
  },
  { key: 'unit_price', label: 'Сумма за ед., ₽', type: 'number' },
  { key: 'qty', label: 'Количество', type: 'number' },
  { key: 'unit', label: 'Единица', placeholder: 'шт, л, компл' },
  { key: 'spent_on', label: 'Дата', type: 'date' },
  { key: 'vendor', label: 'Кому / где' },
  { key: 'note', label: 'Примечание', type: 'textarea' },
  RECEIPT_FIELD,
];

const Finance = () => {
  const navigate = useNavigate();
  const [acts, setActs] = useState<Row[]>([]);
  const [expenses, setExpenses] = useState<Row[]>([]);
  const [facilityRows, setFacilityRows] = useState<Row[]>([]);
  const [locations, setLocations] = useState<Row[]>([]);
  const [office, setOffice] = useState<Row[]>([]);
  const [transfers, setTransfers] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState<number | 'all'>('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, e, h, l, o, t] = await Promise.all([
      listRows('checks'),
      listRows('expenses'),
      listRows('house_expenses'),
      listRows('locations'),
      listRows('office_expenses'),
      listRows('transfers'),
    ]);
    setActs(a);
    setExpenses(e);
    setFacilityRows(h);
    setLocations(l);
    setOffice(o);
    setTransfers(t);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const years = useMemo(() => {
    const set = new Set<number>();
    acts.forEach((a) => {
      const y = Number(String(a.date_from || '').slice(0, 4));
      if (y) set.add(y);
    });
    [...expenses, ...facilityRows].forEach((r) => {
      const y = Number(String(r.spent_on || '').slice(0, 4));
      if (y) set.add(y);
    });
    set.add(new Date().getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [acts, expenses, facilityRows]);

  const inSeason = useCallback(
    (dateStr: unknown) => {
      if (season === 'all') return true;
      return String(dateStr || '').slice(0, 4) === String(season);
    },
    [season],
  );

  const seasonActs = useMemo(() => acts.filter((a) => inSeason(a.date_from)), [acts, inSeason]);
  const seasonExpenses = useMemo(
    () => expenses.filter((e) => inSeason(e.spent_on)),
    [expenses, inSeason],
  );
  const seasonFacility = useMemo(
    () => facilityRows.filter((r) => inSeason(r.spent_on)),
    [facilityRows, inSeason],
  );

  const income = useMemo(() => {
    const total = seasonActs.reduce((s, a) => s + Number(a.final_total || 0), 0);
    const licenses = seasonActs.reduce((s, a) => s + Number(a.licenses_total || 0), 0);
    const stay = seasonActs.reduce((s, a) => s + Number(a.stay_total || 0), 0);
    const extras = seasonActs.reduce((s, a) => s + Number(a.extras_total || 0), 0);
    const discount = seasonActs.reduce(
      (s, a) => s + (Number(a.total || 0) - Number(a.final_total || 0)),
      0,
    );
    return { total, licenses, stay, extras, discount, count: seasonActs.length };
  }, [seasonActs]);

  const huntExpenses = useMemo(
    () => seasonExpenses.filter((e) => String(e.kind || 'hunt') === 'hunt'),
    [seasonExpenses],
  );

  const huntByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    HUNT_CATEGORIES.forEach((c) => {
      map[c.key] = 0;
    });
    huntExpenses.forEach((e) => {
      const k = String(e.category || 'other');
      map[k] = (map[k] || 0) + Number(e.total || 0);
    });
    return map;
  }, [huntExpenses]);

  const huntTotal = huntExpenses.reduce((s, e) => s + Number(e.total || 0), 0);

  const seasonOffice = useMemo(
    () => office.filter((r) => inSeason(r.spent_on)),
    [office, inSeason],
  );

  const officeByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    OFFICE_CATEGORIES.forEach((c) => {
      map[c.key] = 0;
    });
    seasonOffice.forEach((r) => {
      const k = String(r.category || 'other');
      map[k] = (map[k] || 0) + Number(r.amount || 0);
    });
    return map;
  }, [seasonOffice]);

  const officeTotal = seasonOffice.reduce((s, r) => s + Number(r.amount || 0), 0);

  const otherByKind = useMemo(() => {
    const map: Record<string, { sum: number; rows: Row[] }> = {};
    OTHER_KINDS.forEach((k) => {
      map[k.key] = { sum: 0, rows: [] };
    });
    seasonExpenses.forEach((e) => {
      const k = String(e.kind || 'hunt');
      if (k === 'hunt' || k === 'location' || SPLIT_KEYS.includes(k)) return;
      if (!map[k]) map[k] = { sum: 0, rows: [] };
      map[k].sum += Number(e.total || 0);
      map[k].rows.push(e);
    });
    return map;
  }, [seasonExpenses]);

  const otherTotal = OTHER_KINDS.reduce((s, k) => s + (otherByKind[k.key]?.sum || 0), 0);

  const seasonTransfers = useMemo(
    () => transfers.filter((r) => inSeason(r.spent_on)),
    [transfers, inSeason],
  );

  const transfersTotal = seasonTransfers.reduce((s, r) => s + Number(r.amount || 0), 0);
  const transfersFree = seasonTransfers
    .filter((r) => !r.section)
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  const facilityTotals = useMemo(() => {
    const map: Record<string, number> = {};
    Object.keys(FACILITIES).forEach((k) => {
      map[k] = 0;
    });
    seasonFacility.forEach((r) => {
      const k = String(r.facility || 'house');
      map[k] = (map[k] || 0) + Number(r.total || 0);
    });
    return map;
  }, [seasonFacility]);

  const facilityTotal = Object.values(facilityTotals).reduce((s, v) => s + v, 0);

  const locationKindOf = useMemo(() => {
    const map: Record<string, string> = {};
    locations.forEach((l) => {
      map[String(l.id)] = String(l.kind || 'ground');
    });
    return map;
  }, [locations]);

  const locationTotals = useMemo(() => {
    const map: Record<string, number> = {};
    LOCATION_KINDS.forEach((k) => {
      map[k.key] = 0;
    });
    seasonExpenses.forEach((e) => {
      if (String(e.kind) !== 'location' || !e.location_id) return;
      const k = locationKindOf[String(e.location_id)] || 'ground';
      map[k] = (map[k] || 0) + Number(e.total || 0);
    });
    return map;
  }, [seasonExpenses, locationKindOf]);

  const locationTotal = Object.values(locationTotals).reduce((s, v) => s + v, 0);
  const expenseTotal =
    huntTotal + officeTotal + otherTotal + facilityTotal + locationTotal + transfersFree;
  const profit = income.total - expenseTotal;

  const splitRows = useMemo(
    () => seasonExpenses.filter((e) => SPLIT_KEYS.includes(String(e.kind))),
    [seasonExpenses],
  );

  const split = useMemo(() => {
    const map: Record<string, { sum: number; rows: Row[] }> = {};
    SPLIT_KINDS.forEach((k) => {
      map[k.key] = { sum: 0, rows: [] };
    });
    splitRows.forEach((r) => {
      const k = String(r.kind);
      if (!map[k]) map[k] = { sum: 0, rows: [] };
      map[k].sum += Number(r.total || 0);
      map[k].rows.push(r);
    });
    return map;
  }, [splitRows]);

  const toAccount = split.to_account?.sum || 0;
  const leftOnFarm = income.total - expenseTotal - toAccount;

  const save = async (values: Row) => {
    const unitPrice = Number(values.unit_price || 0);
    const qty = Number(values.qty || 0);
    const payload: Row = {
      ...values,
      kind: String(values.kind || 'transfer'),
      category: 'other',
      unit_price: unitPrice,
      qty,
      total: Math.round(unitPrice * qty * 100) / 100,
      spent_on: String(values.spent_on || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
    };
    if (editing?.id) {
      await updateRow('expenses', { ...payload, id: editing.id });
      toast.success('Запись обновлена');
    } else {
      await createRow('expenses', payload);
      toast.success('Расход добавлен');
    }
    setOpen(false);
    setEditing(null);
    load();
  };

  const openEditor = (row: Row) => {
    setEditing(row);
    setOpen(true);
  };

  const archive = async (id: number) => {
    await removeRow('expenses', id);
    toast.success('Запись убрана в архив');
    load();
  };

  return (
    <Layout
      index="Раздел / Финансы"
      title="Финансы"
      lede="Поступления по актам и все расходы хозяйства в одном месте."
      action={
        <button
          className="h-cta"
          onClick={() =>
            openEditor({
              kind: 'transfer',
              qty: 1,
              unit: 'шт',
              spent_on: new Date().toISOString().slice(0, 10),
            } as Row)
          }
        >
          Добавить расход
        </button>
      }
    >
      <FinanceSummary
        years={years}
        season={season}
        setSeason={setSeason}
        income={income}
        expenseTotal={expenseTotal}
        profit={profit}
        toAccount={toAccount}
        leftOnFarm={leftOnFarm}
        splitRows={splitRows}
        splitAccountCount={split.to_account?.rows.length || 0}
        loading={loading}
        onEdit={openEditor}
        onArchive={archive}
      />

      <FinanceHuntOffice
        huntByCategory={huntByCategory}
        huntTotal={huntTotal}
        huntExpenses={huntExpenses}
        officeByCategory={officeByCategory}
        officeTotal={officeTotal}
        seasonOffice={seasonOffice}
        navigate={navigate}
      />

      <FinanceOther
        transfersTotal={transfersTotal}
        seasonTransfers={seasonTransfers}
        otherKinds={OTHER_KINDS}
        otherByKind={otherByKind}
        navigate={navigate}
        onEdit={openEditor}
        onArchive={archive}
      />

      <FinanceFacilities
        facilityTotals={facilityTotals}
        facilityTotal={facilityTotal}
        locationTotals={locationTotals}
        locationTotal={locationTotal}
        navigate={navigate}
      />

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? 'Редактировать расход' : 'Добавить расход'}
        fields={FIELDS}
        initial={editing}
        onSubmit={save}
      />
    </Layout>
  );
};

export default Finance;