import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { GeoSample, watchLocation, GeoHandle, FAIL_TEXT } from '@/lib/geoProvider';

export type GeoFix = GeoSample;

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
  const handleRef = useRef<GeoHandle | null>(null);
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
      const icon = L.divIcon({
        className: '',
        html: markerHtml(p.heading),
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      if (!markerRef.current) {
        markerRef.current = L.marker(pos, { icon, zIndexOffset: 1000, interactive: false }).addTo(
          map,
        );
      } else {
        markerRef.current.setLatLng(pos);
        markerRef.current.setIcon(icon);
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
    handleRef.current?.stop();
    handleRef.current = null;
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
    setError('');
    followRef.current = true;

    if (handleRef.current) {
      if (fix) draw(fix, true);
      return;
    }

    setTracking(true);
    handleRef.current = watchLocation(
      (s) => {
        setError('');
        setFix(s);
        draw(s, followRef.current);
        followRef.current = false;
      },
      (f) => {
        setError(FAIL_TEXT[f.kind]);
        setTracking(false);
        handleRef.current?.stop();
        handleRef.current = null;
      },
    );
  }, [draw, fix]);

  const center = useCallback(() => {
    if (fix) draw(fix, true);
    else start();
  }, [fix, draw, start]);

  useEffect(() => {
    return () => {
      handleRef.current?.stop();
      handleRef.current = null;
    };
  }, []);

  return { tracking, fix, error, start, stop, center };
};

export default useGeoLocate;
