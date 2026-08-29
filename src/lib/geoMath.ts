const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export const distance = (
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number => {
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

export const bearing = (
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number => {
  const dLng = rad(bLng - aLng);
  const y = Math.sin(dLng) * Math.cos(rad(bLat));
  const x =
    Math.cos(rad(aLat)) * Math.sin(rad(bLat)) -
    Math.sin(rad(aLat)) * Math.cos(rad(bLat)) * Math.cos(dLng);
  return (deg(Math.atan2(y, x)) + 360) % 360;
};

export const fmtDistance = (m: number): string => {
  if (!Number.isFinite(m)) return '—';
  if (m < 1000) return `${Math.round(m)} м`;
  if (m < 10000) return `${(m / 1000).toFixed(2)} км`;
  return `${(m / 1000).toFixed(1)} км`;
};

export const fmtSpeed = (mps: number | null): string => {
  if (mps === null || !Number.isFinite(mps) || mps < 0.3) return '0,0 км/ч';
  return `${(mps * 3.6).toFixed(1).replace('.', ',')} км/ч`;
};

const SIDES = [
  'С',
  'ССВ',
  'СВ',
  'ВСВ',
  'В',
  'ВЮВ',
  'ЮВ',
  'ЮЮВ',
  'Ю',
  'ЮЮЗ',
  'ЮЗ',
  'ЗЮЗ',
  'З',
  'ЗСЗ',
  'СЗ',
  'ССЗ',
];

export const sideName = (deg360: number): string =>
  SIDES[Math.round((((deg360 % 360) + 360) % 360) / 22.5) % 16];

export const trackLength = (pts: { lat: number; lng: number }[]): number => {
  let sum = 0;
  for (let i = 1; i < pts.length; i += 1) {
    sum += distance(pts[i - 1].lat, pts[i - 1].lng, pts[i].lat, pts[i].lng);
  }
  return sum;
};
