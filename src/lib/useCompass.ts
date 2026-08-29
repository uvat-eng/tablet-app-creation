import { useEffect, useState } from 'react';

interface CompassEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

type PermApi = { requestPermission?: () => Promise<'granted' | 'denied'> };

export const useCompass = (enabled: boolean) => {
  const [heading, setHeading] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let dead = false;

    const onOrient = (e: Event) => {
      if (dead) return;
      const ev = e as CompassEvent;
      if (typeof ev.webkitCompassHeading === 'number') {
        setHeading(ev.webkitCompassHeading);
        return;
      }
      if (typeof ev.alpha === 'number') {
        setHeading((360 - ev.alpha) % 360);
      }
    };

    const attach = () => {
      window.addEventListener('deviceorientationabsolute', onOrient, true);
      window.addEventListener('deviceorientation', onOrient, true);
    };

    const api = (window as unknown as { DeviceOrientationEvent?: PermApi })
      .DeviceOrientationEvent;

    if (api?.requestPermission) {
      api
        .requestPermission()
        .then((r) => {
          if (r === 'granted' && !dead) attach();
        })
        .catch(() => undefined);
    } else {
      attach();
    }

    return () => {
      dead = true;
      window.removeEventListener('deviceorientationabsolute', onOrient, true);
      window.removeEventListener('deviceorientation', onOrient, true);
    };
  }, [enabled]);

  return heading;
};

export default useCompass;
