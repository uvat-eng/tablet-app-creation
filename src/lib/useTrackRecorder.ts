import { useCallback, useEffect, useRef, useState } from 'react';
import { GeoSample } from '@/lib/geoProvider';
import { distance, trackLength } from '@/lib/geoMath';

export interface TrackPoint {
  lat: number;
  lng: number;
  at: number;
}

const KEY = 'nav-track-v1';
const MIN_STEP = 8;

const read = (): TrackPoint[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TrackPoint[]) : [];
  } catch {
    return [];
  }
};

const write = (pts: TrackPoint[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(pts));
  } catch {
    /* память переполнена — след останется в текущем сеансе */
  }
};

export const useTrackRecorder = () => {
  const [points, setPoints] = useState<TrackPoint[]>(read);
  const [recording, setRecording] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const ref = useRef<TrackPoint[]>(points);

  useEffect(() => {
    ref.current = points;
  }, [points]);

  const push = useCallback(
    (s: GeoSample) => {
      if (!recording) return;
      const last = ref.current[ref.current.length - 1];
      if (last && distance(last.lat, last.lng, s.lat, s.lng) < MIN_STEP) return;
      const next = [...ref.current, { lat: s.lat, lng: s.lng, at: s.at }];
      ref.current = next;
      setPoints(next);
      write(next);
    },
    [recording],
  );

  const start = useCallback(() => {
    setRecording(true);
    setStartedAt(Date.now());
  }, []);

  const stop = useCallback(() => {
    setRecording(false);
  }, []);

  const clear = useCallback(() => {
    setPoints([]);
    ref.current = [];
    setStartedAt(null);
    setRecording(false);
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* уже пусто */
    }
  }, []);

  const length = trackLength(points);

  return { points, recording, start, stop, clear, push, length, startedAt };
};

export default useTrackRecorder;
