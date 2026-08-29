import { useEffect, useState } from 'react';

interface BatteryLike extends EventTarget {
  level: number;
  charging: boolean;
}

export const useBattery = () => {
  const [level, setLevel] = useState<number | null>(null);
  const [charging, setCharging] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<BatteryLike>;
    };
    if (!nav.getBattery) return;
    let bat: BatteryLike | null = null;

    const sync = () => {
      if (!bat) return;
      setLevel(Math.round(bat.level * 100));
      setCharging(bat.charging);
    };

    nav
      .getBattery()
      .then((b) => {
        bat = b;
        sync();
        b.addEventListener('levelchange', sync);
        b.addEventListener('chargingchange', sync);
      })
      .catch(() => undefined);

    return () => {
      bat?.removeEventListener('levelchange', sync);
      bat?.removeEventListener('chargingchange', sync);
    };
  }, []);

  return { level, charging };
};

export default useBattery;
