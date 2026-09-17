import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '@/components/app/Layout';
import Icon from '@/components/ui/icon';
import RecordDialog, { Field } from '@/components/app/RecordDialog';
import PlanTable from '@/components/app/PlanTable';
import { Row, listRows, createRow, updateRow } from '@/lib/api';
import { printPlan, planText } from '@/lib/printPlan';
import { Share } from '@capacitor/share';
import { toast } from 'sonner';

const today = () => new Date().toISOString().slice(0, 10);

const MyHuntPlans = () => {
  const [plans, setPlans] = useState<Row[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [transport, setTransport] = useState<Row[]>([]);
  const [locations, setLocations] = useState<Row[]>([]);
  const [keepers, setKeepers] = useState<Row[]>([]);
  const [guns, setGuns] = useState<Row[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const loadRefs = useCallback(async () => {
    const [o, l, k, w] = await Promise.all([
      listRows('objects'),
      listRows('locations'),
      listRows('guests', { keepers: true }),
      listRows('weapons', { guns: true }),
    ]);
    setTransport(o.filter((x) => String(x.kind) === 'transport'));
    setLocations(l);
    setKeepers(k);
    setGuns(w);
  }, []);

  const loadPlans = useCallback(async () => {
    const p = await listRows('hunt_plans', { mine: true });
    setPlans(p);
    setActive((cur) => (cur && p.some((x) => Number(x.id) === cur) ? cur : Number(p[0]?.id) || null));
    setLoading(false);
  }, []);

  const loadRows = useCallback(async (planId: number) => {
    const r = await listRows('hunt_plan_rows', { mine: true, planId });
    setRows(r);
  }, []);

  useEffect(() => {
    loadRefs();
    loadPlans();
  }, [loadRefs, loadPlans]);

  useEffect(() => {
    if (active) loadRows(active);
    else setRows([]);
  }, [active, loadRows]);

  const planFields: Field[] = useMemo(
    () => [
      { key: 'title', label: 'Название охоты', placeholder: 'Загонная на кабана' },
      { key: 'date_from', label: 'Дата начала', type: 'date' },
      { key: 'date_to', label: 'Дата окончания', type: 'date' },
      { key: 'note', label: 'Заметка', type: 'textarea' },
    ],
    [],
  );

  const savePlan = async (values: Row) => {
    const payload: Row = {
      ...values,
      title: String(values.title || '').trim() || 'Охота',
      date_from: String(values.date_from || today()).slice(0, 10),
      date_to: String(values.date_to || values.date_from || today()).slice(0, 10),
    };
    try {
      if (editing?.id) {
        await updateRow('hunt_plans', { ...payload, id: editing.id }, true);
        toast.success('Охота обновлена');
      } else {
        const created = await createRow('hunt_plans', payload, true);
        setActive(Number(created.id));
        toast.success('Охота создана');
      }
      setOpen(false);
      setEditing(null);
      loadPlans();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось сохранить');
    }
  };

  const plan = plans.find((p) => Number(p.id) === active) || null;

  const doPrint = () => {
    if (!plan) return;
    if (!rows.length) {
      toast.error('В плане нет строк');
      return;
    }
    if (!printPlan(plan, rows)) toast.error('Разрешите всплывающие окна для печати');
  };

  const doShare = async () => {
    if (!plan) return;
    if (!rows.length) {
      toast.error('В плане нет строк');
      return;
    }
    const text = planText(plan, rows);
    const title = String(plan.title || 'План охоты');
    try {
      await Share.share({ title, text, dialogTitle: title });
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        toast.success('План скопирован — вставьте в мессенджер или письмо');
      } catch {
        toast.error('Не удалось отправить план');
      }
    }
  };

  return (
    <Layout
      index="Кабинет / Планирование"
      title="Планирование больших охот"
      lede="Общий план клуба: охотник, егерь, транспорт и локация."
      action={
        <button
          className="h-cta"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Icon name="Plus" size={15} /> Создать охоту
        </button>
      }
    >
      {loading ? (
        <div className="h-label">Загружаю…</div>
      ) : plans.length === 0 ? (
        <div className="border border-[#e2e2df] p-12 text-center">
          <Icon name="CalendarRange" size={26} fallback="CalendarDays" />
          <div className="h-head text-[18px] mt-4">Охоты пока не запланированы</div>
          <div className="h-mono-cap mt-2 text-[var(--hero-muted)]">
            Нажмите «Создать охоту» — потом добавите людей и технику
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-5">
            {plans.map((p) => {
              const on = Number(p.id) === active;
              return (
                <button
                  key={String(p.id)}
                  onClick={() => setActive(Number(p.id))}
                  className="border px-3 py-2 text-left"
                  style={{
                    borderColor: on ? 'var(--hero-ink)' : '#e2e2df',
                    background: on ? 'var(--hero-surface)' : '#fff',
                  }}
                >
                  <div className="text-[0.85em]">{String(p.title || '')}</div>
                  <div className="h-label">
                    {String(p.date_from || '').slice(0, 10)}
                    {p.date_to && p.date_to !== p.date_from
                      ? ` – ${String(p.date_to).slice(0, 10)}`
                      : ''}
                  </div>
                  {p.created_by_name ? (
                    <div className="h-label text-[var(--hero-muted)]">
                      {String(p.created_by_name)}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          {plan && (
            <>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <div className="h-head text-[22px] flex-1">{String(plan.title || '')}</div>
                <button className="h-cta-ghost" onClick={doShare}>
                  <Icon name="Share2" size={14} fallback="Send" /> Отправить
                </button>
                <button className="h-cta-ghost" onClick={doPrint}>
                  <Icon name="Printer" size={14} /> Печать
                </button>
                <button
                  className="h-cta-ghost"
                  onClick={() => {
                    setEditing(plan);
                    setOpen(true);
                  }}
                >
                  <Icon name="Pencil" size={14} /> Изменить
                </button>
              </div>

              <PlanTable
                planId={Number(plan.id)}
                rows={rows}
                transport={transport}
                locations={locations}
                keepers={keepers}
                guns={guns}
                onReload={() => loadRows(Number(plan.id))}
              />
            </>
          )}
        </>
      )}

      <RecordDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditing(null);
        }}
        title={editing ? 'Изменить охоту' : 'Создать охоту'}
        fields={planFields}
        initial={editing || { date_from: today(), date_to: today() }}
        onSubmit={savePlan}
      />
    </Layout>
  );
};

export default MyHuntPlans;