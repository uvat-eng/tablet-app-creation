export interface CountryPoint {
  name: string;
  x: number;
  y: number;
  flag: string;
}

export const COUNTRIES: CountryPoint[] = [
  { name: 'Финляндия', x: 57.2, y: 15.6, flag: '🇫🇮' },
  { name: 'Норвегия', x: 52.5, y: 16.1, flag: '🇳🇴' },
  { name: 'Швеция', x: 54.2, y: 16.7, flag: '🇸🇪' },
  { name: 'Эстония', x: 56.9, y: 17.4, flag: '🇪🇪' },
  { name: 'Латвия', x: 56.8, y: 18.4, flag: '🇱🇻' },
  { name: 'Канада', x: 20.6, y: 18.9, flag: '🇨🇦' },
  { name: 'Россия', x: 60.5, y: 19.0, flag: '🇷🇺' },
  { name: 'Литва', x: 56.6, y: 19.3, flag: '🇱🇹' },
  { name: 'Великобритания', x: 49.4, y: 20.0, flag: '🇬🇧' },
  { name: 'Беларусь', x: 57.8, y: 20.2, flag: '🇧🇾' },
  { name: 'Польша', x: 55.3, y: 21.1, flag: '🇵🇱' },
  { name: 'Германия', x: 52.9, y: 21.6, flag: '🇩🇪' },
  { name: 'Чехия', x: 54.3, y: 22.3, flag: '🇨🇿' },
  { name: 'Украина', x: 58.9, y: 22.8, flag: '🇺🇦' },
  { name: 'Словакия', x: 55.4, y: 22.9, flag: '🇸🇰' },
  { name: 'Казахстан', x: 68.6, y: 23.3, flag: '🇰🇿' },
  { name: 'Австрия', x: 53.9, y: 23.6, flag: '🇦🇹' },
  { name: 'Венгрия', x: 55.4, y: 23.8, flag: '🇭🇺' },
  { name: 'Молдова', x: 58.0, y: 23.9, flag: '🇲🇩' },
  { name: 'Монголия', x: 78.6, y: 24.0, flag: '🇲🇳' },
  { name: 'Швейцария', x: 52.3, y: 24.0, flag: '🇨🇭' },
  { name: 'Франция', x: 50.6, y: 24.1, flag: '🇫🇷' },
  { name: 'Румыния', x: 56.9, y: 24.5, flag: '🇷🇴' },
  { name: 'Сербия', x: 55.8, y: 25.6, flag: '🇷🇸' },
  { name: 'Италия', x: 53.5, y: 26.2, flag: '🇮🇹' },
  { name: 'Болгария', x: 57.1, y: 26.3, flag: '🇧🇬' },
  { name: 'Грузия', x: 62.1, y: 26.7, flag: '🇬🇪' },
  { name: 'Узбекистан', x: 67.9, y: 27.0, flag: '🇺🇿' },
  { name: 'Киргизия', x: 70.8, y: 27.1, flag: '🇰🇬' },
  { name: 'Азербайджан', x: 63.3, y: 27.6, flag: '🇦🇿' },
  { name: 'Армения', x: 62.5, y: 27.7, flag: '🇦🇲' },
  { name: 'Испания', x: 49.0, y: 27.8, flag: '🇪🇸' },
  { name: 'США', x: 22.8, y: 27.9, flag: '🇺🇸' },
  { name: 'Турция', x: 59.7, y: 28.3, flag: '🇹🇷' },
  { name: 'Греция', x: 56.1, y: 28.3, flag: '🇬🇷' },
  { name: 'Таджикистан', x: 69.8, y: 28.4, flag: '🇹🇯' },
  { name: 'Туркмения', x: 66.6, y: 28.4, flag: '🇹🇲' },
  { name: 'Китай', x: 78.9, y: 30.6, flag: '🇨🇳' },
  { name: 'ОАЭ', x: 65.0, y: 36.7, flag: '🇦🇪' },
  { name: 'Индия', x: 71.7, y: 38.3, flag: '🇮🇳' },
  { name: 'Бразилия', x: 35.6, y: 55.6, flag: '🇧🇷' },
  { name: 'Австралия', x: 87.2, y: 63.9, flag: '🇦🇺' },
  { name: 'ЮАР', x: 56.7, y: 66.1, flag: '🇿🇦' },
  { name: 'Аргентина', x: 32.2, y: 71.1, flag: '🇦🇷' },
];

export const findCountry = (name: string): CountryPoint | undefined => {
  const q = String(name || '').trim().toLowerCase();
  if (!q) return undefined;
  return COUNTRIES.find((c) => c.name.toLowerCase() === q);
};
