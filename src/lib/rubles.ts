const ONES = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
const ONES_F = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
const TEENS = [
  'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать',
  'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать',
];
const TENS = [
  '', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят',
  'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто',
];
const HUNDREDS = [
  '', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот',
  'шестьсот', 'семьсот', 'восемьсот', 'девятьсот',
];

const plural = (n: number, forms: [string, string, string]) => {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return forms[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1];
  return forms[2];
};

const triadWords = (n: number, female: boolean): string[] => {
  const out: string[] = [];
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  if (h) out.push(HUNDREDS[h]);
  if (t === 1) {
    out.push(TEENS[o]);
  } else {
    if (t) out.push(TENS[t]);
    if (o) out.push(female ? ONES_F[o] : ONES[o]);
  }
  return out;
};

export const rublesInWords = (value: number): string => {
  const total = Math.round(Math.abs(Number(value) || 0) * 100);
  const rub = Math.floor(total / 100);
  const kop = total % 100;

  const words: string[] = [];
  if (rub === 0) {
    words.push('ноль');
  } else {
    const groups: { value: number; female: boolean; forms: [string, string, string] }[] = [
      { value: Math.floor(rub / 1000000000) % 1000, female: false, forms: ['миллиард', 'миллиарда', 'миллиардов'] },
      { value: Math.floor(rub / 1000000) % 1000, female: false, forms: ['миллион', 'миллиона', 'миллионов'] },
      { value: Math.floor(rub / 1000) % 1000, female: true, forms: ['тысяча', 'тысячи', 'тысяч'] },
      { value: rub % 1000, female: false, forms: ['', '', ''] },
    ];
    groups.forEach((g) => {
      if (!g.value) return;
      words.push(...triadWords(g.value, g.female));
      if (g.forms[0]) words.push(plural(g.value, g.forms));
    });
  }

  const text = words.join(' ');
  const capped = text.charAt(0).toUpperCase() + text.slice(1);
  const rubWord = plural(rub, ['рубль', 'рубля', 'рублей']);
  const kopWord = plural(kop, ['копейка', 'копейки', 'копеек']);
  return `${capped} ${rubWord} ${String(kop).padStart(2, '0')} ${kopWord}`;
};
