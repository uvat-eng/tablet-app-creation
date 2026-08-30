import { useCallback, useEffect, useRef, useState } from 'react';
import { GeoSample } from '@/lib/geoProvider';
import {
  Person,
  pushPresence,
  fetchPresence,
  stopPresence,
} from '@/lib/fieldPresence';

const KEY = 'hb_share_position';
const PUSH_MS = 30000;
const POLL_MS = 45000;
const SOS_MS = 12000;

const readFlag = () => localStorage.getItem(KEY) === '1';

export const useFieldPresence = (fix: GeoSample | null, battery: number | null) => {
  const [sharing, setSharing] = useState(readFlag);
  const [people, setPeople] = useState<Person[]>([]);
  const [linked, setLinked] = useState(false);
  const [sos, setSos] = useState(false);

  const fixRef = useRef(fix);
  const batRef = useRef(battery);
  const sosRef = useRef(sos);
  const busy = useRef(false);

  useEffect(() => {
    fixRef.current = fix;
  }, [fix]);
  useEffect(() => {
    batRef.current = battery;
  }, [battery]);
  useEffect(() => {
    sosRef.current = sos;
  }, [sos]);

  const sync = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const f = fixRef.current;
      const list =
        sharing && f
          ? await pushPresence({
              lat: f.lat,
              lng: f.lng,
              accuracy: Math.round(f.accuracy),
              speed: f.speed,
              heading: f.heading,
              battery: batRef.current,
              sos: sosRef.current,
              sharing: true,
            })
          : await fetchPresence();
      setPeople(list);
      setLinked(true);
    } catch {
      setLinked(false);
    } finally {
      busy.current = false;
    }
  }, [sharing]);

  const anySos = people.some((p) => p.sos);

  useEffect(() => {
    sync();
    const every = anySos ? SOS_MS : sharing ? PUSH_MS : POLL_MS;
    const t = setInterval(sync, every);
    return () => clearInterval(t);
  }, [sync, sharing, anySos]);

  const toggle = useCallback(async () => {
    const next = !sharing;
    setSharing(next);
    localStorage.setItem(KEY, next ? '1' : '0');
    if (!next) {
      setSos(false);
      try {
        await stopPresence();
      } catch {
        /* уйдёт само через 15 минут молчания */
      }
    }
  }, [sharing]);

  const raiseSos = useCallback(
    async (on: boolean) => {
      setSos(on);
      sosRef.current = on;
      const f = fixRef.current;
      if (!f) return;
      try {
        const list = await pushPresence({
          lat: f.lat,
          lng: f.lng,
          accuracy: Math.round(f.accuracy),
          speed: f.speed,
          heading: f.heading,
          battery: batRef.current,
          sos: on,
          sharing: true,
        });
        setPeople(list);
        setLinked(true);
        if (on && !sharing) {
          setSharing(true);
          localStorage.setItem(KEY, '1');
        }
      } catch {
        setLinked(false);
      }
    },
    [sharing],
  );

  const others = people.filter((p) => !p.me);

  return { sharing, toggle, people, others, linked, sos, raiseSos, refresh: sync };
};

export default useFieldPresence;