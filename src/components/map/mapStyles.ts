import L from 'leaflet';

export const COLORS: Record<string, string> = {
  tower: '#ff5a1f',
  feeder: '#f4c20d',
  salt: '#8e6bd4',
  clearing: '#00b8d4',
  crops: '#00c853',
  enclosure: '#e91e63',
  ground: '#607d8b',
  base: '#1f1f1d',
};

export const pinIcon = (kind: string) => {
  const size = kind === 'base' ? 22 : 16;
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${
      COLORS[kind] || '#607d8b'
    };border:3px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.35)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};