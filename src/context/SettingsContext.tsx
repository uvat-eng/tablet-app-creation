import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { FarmSettings, getSettings, saveSettings, Row } from '@/lib/api';

interface SettingsValue {
  settings: FarmSettings;
  loading: boolean;
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
  save: async () => undefined,
  reload: async () => undefined,
});

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<FarmSettings>(EMPTY);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const data = await getSettings();
    setSettings(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = async (body: Row) => {
    const data = await saveSettings(body);
    setSettings(data);
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, save, reload }}>
      {children}
    </SettingsContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSettings = () => useContext(SettingsContext);

export default SettingsContext;
