import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { FarmSettings, getSettings, saveSettings, cachedSettings, onConnection, Row } from '@/lib/api';
import { initCache } from '@/lib/localCache';

interface SettingsValue {
  settings: FarmSettings;
  loading: boolean;
  known: boolean;
  save: (body: Row) => Promise<void>;
  reload: () => Promise<void>;
}

const EMPTY: FarmSettings = {
  farm_name: '',
  logo_url: null,
  configured: false,
  org_name: '',
  org_inn: '',
  org_kpp: '',
  org_address: '',
  org_director: '',
  org_director_short: '',
  base_place: '',
  base_region: '',
  agreement_no: '',
  grounds: '',
  pay_card: '',
  pay_day: '03',
  fee_monthly: 6500,
  org_full_name: '',
  org_ogrn: '',
  org_okved: '',
  org_address_fact: '',
  org_bank: '',
  org_rs: '',
  org_ks: '',
  org_bik: '',
};

const SettingsContext = createContext<SettingsValue>({
  settings: EMPTY,
  loading: true,
  known: false,
  save: async () => undefined,
  reload: async () => undefined,
});

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<FarmSettings>(() => cachedSettings() || EMPTY);
  const [loading, setLoading] = useState(() => !cachedSettings());
  const [known, setKnown] = useState(() => Boolean(cachedSettings()));

  const reload = useCallback(async () => {
    try {
      setSettings(await getSettings(true));
      setKnown(true);
    } catch {
      const c = cachedSettings();
      if (c) setSettings(c);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const guard = setTimeout(() => setLoading(false), 10000);
    initCache().then(() => {
      const c = cachedSettings();
      if (c) {
        setSettings(c);
        setKnown(true);
        setLoading(false);
      }
      reload();
    });
    const off = onConnection((v) => {
      if (v) reload();
    });
    return () => {
      off();
      clearTimeout(guard);
    };
  }, [reload]);

  const save = async (body: Row) => {
    const data = await saveSettings(body);
    setSettings(data);
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, known, save, reload }}>
      {children}
    </SettingsContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSettings = () => useContext(SettingsContext);

export default SettingsContext;
