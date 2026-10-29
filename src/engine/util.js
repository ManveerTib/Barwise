// Small helpers shared by every problem template.

// Seeded random numbers (mulberry32), so a problem can be rebuilt from its seed.
export function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    shuffle: (arr) => {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}

export const newSeed = () => Math.floor(Math.random() * 2 ** 31);

// 1234.5 -> "1,234.5"
export function fmt(n) {
  if (!Number.isFinite(n)) return String(n);
  const r = Math.round(n * 100) / 100;
  return r.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export const money = (n) => '$' + fmt(n);

export const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));

// Names drawn for word problems. Problems refer to people by name, never by pronoun.
export const NAMES = [
  'Ali', 'Mei', 'Ben', 'Priya', 'Jun', 'Sofia', 'Arjun', 'Hana', 'Leo', 'Aisha',
  'Kai', 'Zara', 'Ravi', 'Lin', 'Omar', 'Tara', 'Noah', 'Ines', 'Sam', 'Jia',
];

export function twoNames(rng) {
  const a = rng.pick(NAMES);
  let b = rng.pick(NAMES);
  while (b === a) b = rng.pick(NAMES);
  return [a, b];
}

export const ITEMS = ['stamps', 'stickers', 'marbles', 'beads', 'cards', 'shells'];

export function unitWord(n) {
  return n === 1 ? 'unit' : 'units';
}

// Parse what a student typed: "1,215", "$45", " 7.5 " -> number, or null.
export function parseNumber(text) {
  if (text == null) return null;
  const cleaned = String(text).replace(/[\s,$]/g, '').replace(/(units?|%)$/i, '');
  if (!/^-?\d*\.?\d+$/.test(cleaned)) return null;
  const v = Number(cleaned);
  return Number.isFinite(v) ? v : null;
}

export const near = (a, b) => Math.abs(a - b) < 1e-6;
