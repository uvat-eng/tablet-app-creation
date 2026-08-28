import { useEffect, useState } from 'react';
import Layout from '@/components/app/Layout';
import { useSettings } from '@/context/SettingsContext';
import { uploadPhoto } from '@/lib/api';
import BackupPanel from '@/components/app/BackupPanel';
import { toast } from 'sonner';

const ORG_FIELDS = [
  { key: 'org_name', label: 'Организация (сокращённо)', wide: true },
  { key: 'org_full_name', label: 'Полное наименование', wide: true },
  { key: 'org_inn', label: 'ИНН' },
  { key: 'org_kpp', label: 'КПП' },
  { key: 'org_ogrn', label: 'ОГРН' },
  { key: 'org_okved', label: 'ОКВЭД' },
  { key: 'org_address', label: 'Юридический адрес', wide: true },
  { key: 'org_address_fact', label: 'Фактический адрес', wide: true },
  { key: 'org_director', label: 'Директор (в лице кого, родительный падеж)', wide: true },
  { key: 'org_director_short', label: 'Директор для подписи' },
  { key: 'base_place', label: 'Населённый пункт базы' },
  { key: 'base_region', label: 'Район и область', wide: true },
  { key: 'agreement_no', label: 'Охотхозяйственное соглашение' },
  { key: 'grounds', label: 'Охотничьи угодья' },
  { key: 'org_bank', label: 'Банк' },
  { key: 'org_rs', label: 'Расчётный счёт' },
  { key: 'org_ks', label: 'Корреспондентский счёт' },
  { key: 'org_bik', label: 'БИК' },
  { key: 'pay_card', label: 'Карта для взносов' },
  { key: 'pay_day', label: 'Оплата до какого числа' },
  { key: 'fee_monthly', label: 'Взнос в месяц, ₽' },
];

const Settings = () => {
  const { settings, save } = useSettings();
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [uploading, setUploading] = useState(false);
  const [org, setOrg] = useState<Record<string, string>>({});

  useEffect(() => {
    setName(settings.farm_name);
    setLogo(settings.logo_url || '');
    setOrg({
      org_name: settings.org_name,
      org_full_name: settings.org_full_name,
      org_ogrn: settings.org_ogrn,
      org_okved: settings.org_okved,
      org_address_fact: settings.org_address_fact,
      org_bank: settings.org_bank,
      org_rs: settings.org_rs,
      org_ks: settings.org_ks,
      org_bik: settings.org_bik,
      org_inn: settings.org_inn,
      org_kpp: settings.org_kpp,
      org_address: settings.org_address,
      org_director: settings.org_director,
      org_director_short: settings.org_director_short,
      base_place: settings.base_place,
      base_region: settings.base_region,
      agreement_no: settings.agreement_no,
      grounds: settings.grounds,
      pay_card: settings.pay_card,
      pay_day: settings.pay_day,
      fee_monthly: String(settings.fee_monthly),
    });
  }, [settings]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      setLogo(await uploadPhoto(file, 'brand'));
      toast.success('Логотип загружен');
    } catch {
      toast.error('Не удалось загрузить логотип');
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    await save({
      farm_name: name.trim(),
      logo_url: logo || null,
      configured: true,
      ...org,
      fee_monthly: Number(org.fee_monthly || 6500),
    });
    toast.success('Настройки сохранены');
  };

  const input = 'w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white max-w-[420px]';

  return (
    <Layout
      index="Раздел / Настройки"
      title="Настройки хозяйства"
      lede="Название и логотип показываются в меню и на всех экранах базы."
      action={
        <button className="h-cta" onClick={submit}>
          Сохранить
        </button>
      }
    >
      <label className="block">
        <span className="h-label block mb-1">Название охотничьего хозяйства</span>
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <div className="mt-7">
        <span className="h-label block mb-2">Логотип</span>
        {logo && (
          <img
            src={logo}
            alt=""
            className="h-[90px] w-auto object-contain border border-[#e2e2df] p-2 mb-3"
          />
        )}
        <input
          type="file"
          accept="image/*"
          className="text-[0.72em]"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        {uploading && <span className="h-label block mt-2">Загружаем…</span>}
        {logo && (
          <button className="h-label underline block mt-3" onClick={() => setLogo('')}>
            Убрать логотип
          </button>
        )}
      </div>

      <div className="mt-10 pt-8 border-t border-[#e2e2df]">
        <div className="h-head text-[22px] mb-1">Реквизиты для договоров</div>
        <div className="h-mono-cap normal-case mb-5 text-[var(--hero-muted)]">
          Подставляются в путёвку-договор члена клуба при печати.
        </div>
        <div className="grid gap-4 sm:grid-cols-2 max-w-[880px]">
          {ORG_FIELDS.map((f) => (
            <label key={f.key} className={f.wide ? 'sm:col-span-2' : ''}>
              <span className="h-label block mb-1">{f.label}</span>
              <input
                className="w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white"
                value={org[f.key] || ''}
                onChange={(e) => setOrg({ ...org, [f.key]: e.target.value })}
              />
            </label>
          ))}
        </div>
      </div>

      <BackupPanel />
    </Layout>
  );
};

export default Settings;