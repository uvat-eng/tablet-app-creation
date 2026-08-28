import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';

export interface GeoFix {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  at: number;
}

const markerHtml = (heading: number | null) => {
  const arrow =
    heading === null
      ? ''
      : `<div style="position:absolute;left:50%;top:50%;width:0;height:0;
          transform:translate(-50%,-50%) rotate(${heading}deg) translateY(-17px);
          border-left:7px solid transparent;border-right:7px solid transparent;
          border-bottom:12px solid #1a73e8;filter:drop-shadow(0 0 1px #fff)"></div>`;
  return `<div style="position:relative;width:22px;height:22px">
    ${arrow}
    <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
      width:16px;height:16px;border-radius:50%;background:#1a73e8;
      border:3px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.35)"></div>
  </div>`;
};

export const useGeoLocate = (mapRef: React.MutableRefObject<L.Map | null>) => {
  const watchRef = useRef<number | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const followRef = useRef(true);

  const [tracking, setTracking] = useState(false);
  const [fix, setFix] = useState<GeoFix | null>(null);
  const [error, setError] = useState('');

  const draw = useCallback(
    (p: GeoFix, follow: boolean) => {
      const map = mapRef.current;
      if (!map) return;
      const pos: L.LatLngExpression = [p.lat, p.lng];

      if (!markerRef.current) {
        markerRef.current = L.marker(pos, {
          icon: L.divIcon({ className: '', html: markerHtml(p.heading), iconSize: [22, 22], iconAnchor: [11, 11] }),
          zIndexOffset: 1000,
          interactive: false,
        }).addTo(map);
      } else {
        markerRef.current.setLatLng(pos);
        markerRef.current.setIcon(
          L.divIcon({ className: '', html: markerHtml(p.heading), iconSize: [22, 22], iconAnchor: [11, 11] }),
        );
      }

      if (!circleRef.current) {
        circleRef.current = L.circle(pos, {
          radius: p.accuracy,
          color: '#1a73e8',
          weight: 1,
          fillColor: '#1a73e8',
          fillOpacity: 0.12,
          interactive: false,
        }).addTo(map);
      } else {
        circleRef.current.setLatLng(pos);
        circleRef.current.setRadius(p.accuracy);
      }

      if (follow) map.setView(pos, Math.max(map.getZoom(), 15), { animate: true });
    },
    [mapRef],
  );

  const stop = useCallback(() => {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
    const map = mapRef.current;
    if (map) {
      if (markerRef.current) map.removeLayer(markerRef.current);
      if (circleRef.current) map.removeLayer(circleRef.current);
    }
    markerRef.current = null;
    circleRef.current = null;
    setTracking(false);
    setFix(null);
  }, [mapRef]);

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Устройство не умеет определять местоположение');
      return;
    }
    setError('');
    followRef.current = true;

    if (watchRef.current !== null) {
      if (fix) draw(fix, true);
      return;
    }

    setTracking(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const next: GeoFix = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy || 0,
          heading: Number.isFinite(pos.coords.heading) ? Number(pos.coords.heading) : null,
          speed: Number.isFinite(pos.coords.speed) ? Number(pos.coords.speed) : null,
          at: Date.now(),
        };
        setError('');
        setFix(next);
        draw(next, followRef.current);
        followRef.current = false;
      },
      (err) => {
        const text =
          err.code === err.PERMISSION_DENIED
            ? 'Доступ к геолокации запрещён. Разрешите его в настройках браузера'
            : err.code === err.POSITION_UNAVAILABLE
              ? 'Сигнал GPS не найден. Выйдите на открытое место'
              : 'Не удалось определить местоположение';
        setError(text);
        setTracking(false);
        if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 3000 },
    );
  }, [draw, fix]);

  const center = useCallback(() => {
    if (fix) draw(fix, true);
    else start();
  }, [fix, draw, start]);

  useEffect(() => {
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  return { tracking, fix, error, start, stop, center };
};

export default useGeoLocate;
