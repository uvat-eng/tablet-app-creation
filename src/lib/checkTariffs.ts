export interface CheckItem {
  name: string;
  hunters: number;
  days: number;
  tariff: number;
  discount: number;
  note: string;
  group: 'stay' | 'license' | 'extra';
  mode: 'perDayPerHunter' | 'perHunter' | 'flat';
}

export const TARIFFS: CheckItem[] = [
  { name: 'КОМПЛЕКС УСЛУГ ПО РАЗМЕЩЕНИЮ', hunters: 0, days: 0, tariff: 12000, discount: 0, note: 'проживание, горячее питание, баня', group: 'stay', mode: 'perDayPerHunter' },
  { name: 'Дополнительный транспорт УАЗ / НИВА', hunters: 0, days: 0, tariff: 3000, discount: 0, note: '', group: 'extra', mode: 'perDayPerHunter' },
  { name: 'Дополнительный транспорт ТРЭКОЛ', hunters: 0, days: 0, tariff: 6500, discount: 0, note: '', group: 'extra', mode: 'perDayPerHunter' },
  { name: 'Дополнительный транспорт Росомаха', hunters: 0, days: 0, tariff: 3500, discount: 0, note: '', group: 'extra', mode: 'perDayPerHunter' },
  { name: 'Дополнительный транспорт Атлет', hunters: 0, days: 0, tariff: 4500, discount: 0, note: '', group: 'extra', mode: 'perDayPerHunter' },
  { name: 'Услуги Бани', hunters: 0, days: 0, tariff: 1000, discount: 0, note: '', group: 'extra', mode: 'perHunter' },
  { name: 'Разделка Косуля', hunters: 0, days: 0, tariff: 2500, discount: 0, note: '', group: 'extra', mode: 'perHunter' },
  { name: 'Разделка Лось', hunters: 0, days: 0, tariff: 5000, discount: 0, note: '', group: 'extra', mode: 'perHunter' },
  { name: 'Разделка Кабан', hunters: 0, days: 0, tariff: 3000, discount: 0, note: '', group: 'extra', mode: 'perHunter' },
  { name: 'Разделка рысь/волк', hunters: 0, days: 0, tariff: 5000, discount: 0, note: '+ соль', group: 'extra', mode: 'perHunter' },
  { name: 'Разделка медведь', hunters: 0, days: 0, tariff: 10000, discount: 0, note: '', group: 'extra', mode: 'perHunter' },
  { name: 'Лицензия Трофейная косуля', hunters: 0, days: 0, tariff: 40000, discount: 0, note: '', group: 'license', mode: 'perHunter' },
  { name: 'Лицензия Косуля все половые виды', hunters: 0, days: 0, tariff: 17000, discount: 0, note: '', group: 'license', mode: 'perHunter' },
  { name: 'Лицензия Косуля Сеголеток', hunters: 0, days: 0, tariff: 12000, discount: 0, note: '', group: 'license', mode: 'perHunter' },
  { name: 'Лицензия Кабан до 100 кг', hunters: 0, days: 0, tariff: 20000, discount: 0, note: '', group: 'license', mode: 'perHunter' },
  { name: 'Лицензия Кабан 101 - 150 кг', hunters: 0, days: 0, tariff: 25000, discount: 0, note: '', group: 'license', mode: 'perHunter' },
  { name: 'Лицензия Кабан 151 - 200 кг', hunters: 0, days: 0, tariff: 30000, discount: 0, note: '', group: 'license', mode: 'perHunter' },
  { name: 'Лицензия Рысь', hunters: 0, days: 0, tariff: 85000, discount: 0, note: 'лицензия', group: 'license', mode: 'perHunter' },
  { name: 'Лицензия медведь', hunters: 0, days: 0, tariff: 95000, discount: 0, note: '', group: 'license', mode: 'perHunter' },
  { name: 'Продукты Метро', hunters: 0, days: 0, tariff: 46000, discount: 0, note: 'продукты и алкоголь', group: 'extra', mode: 'flat' },
  { name: 'Топливо снегоходы', hunters: 0, days: 0, tariff: 43470, discount: 0, note: '', group: 'extra', mode: 'flat' },
  { name: 'Масло 2Т снегоходы', hunters: 0, days: 0, tariff: 0, discount: 0, note: '', group: 'extra', mode: 'flat' },
  { name: 'Трансфер в одну сторону', hunters: 0, days: 0, tariff: 15000, discount: 0, note: '', group: 'extra', mode: 'perHunter' },
];

export const lineSum = (i: CheckItem): number => {
  const base =
    i.mode === 'perDayPerHunter'
      ? i.tariff * (i.days || 0) * (i.hunters || 0)
      : i.mode === 'perHunter'
        ? i.tariff * (i.hunters || 0)
        : i.tariff;
  return Math.round(base * (1 - (i.discount || 0) / 100));
};

export const emptyItems = (): CheckItem[] => TARIFFS.map((t) => ({ ...t }));

export const money = (v: unknown) => `${Number(v || 0).toLocaleString('ru-RU')} ₽`;