import { fmt } from '../util.js';
import { units, choice, num } from '../build.js';

const CONTEXTS = [
  { whole: 'students', intro: (b, p) => `A school has **${fmt(b)}** students. **${p}%** of them walk to school.`, part: 'walk to school', rest: 'do not walk to school', qp: 'How many students walk to school?', qr: 'How many students do not walk to school?' },
  { whole: 'T-shirts', intro: (b, p) => `A shop had **${fmt(b)}** T-shirts. It sold **${p}%** of them.`, part: 'were sold', rest: 'were not sold', qp: 'How many T-shirts were sold?', qr: 'How many T-shirts were not sold?' },
  { whole: 'seats', intro: (b, p) => `A hall has **${fmt(b)}** seats. **${p}%** of the seats are taken.`, part: 'are taken', rest: 'are empty', qp: 'How many seats are taken?', qr: 'How many seats are empty?' },
];

// Cut the bar into 10 units (10% each), 20 units (5% each) or 4 units (25% each).
function unitsFor(p) {
  if (p === 75) return 4;
  return p % 10 === 0 ? 10 : 20;
}

export default {
  id: 'pct',
  name: 'Percentage of a quantity',
  unitId: 'u3',
  blurb: 'Treat the whole bar as 100%, cut it into equal units, then count the units you need.',
  heuristic: '100% = the whole bar. Find one unit first.',
  fields: [
    { key: 'p', label: 'Percent (multiple of 5)', min: 5, max: 95 },
    { key: 'base', label: 'Whole amount', min: 4, max: 1000000 },
  ],

  generate(rng) {
    const p = rng.pick([20, 30, 40, 60, 70, 80, 90, 15, 35, 45, 55, 65, 85, 75]);
    const U = unitsFor(p);
    const per = U === 20 ? rng.int(3, 24) : U === 10 ? rng.int(5, 60) : rng.int(10, 120);
    return { p, base: U * per, ctx: rng.int(0, CONTEXTS.length - 1), ask: rng.pick(['part', 'rest']) };
  },

  validate({ p, base }) {
    if (p % 5 !== 0 || p <= 0 || p >= 100) return 'Use a percent between 5 and 95 that is a multiple of 5.';
    const U = unitsFor(p);
    if (base % U !== 0) return `The whole must divide evenly by ${U}.`;
    return null;
  },

  build({ p, base, ctx = 0, ask = 'part' }, rng) {
    const c = CONTEXTS[ctx % CONTEXTS.length];
    const U = unitsFor(p);
    const each = 100 / U; // percent per unit
    const u = base / U;
    const pu = p / each; // units in the part
    const part = pu * u;
    const rest = base - part;
    const answer = ask === 'part' ? part : rest;
    const text = `${c.intro(base, p)} ${ask === 'part' ? c.qp : c.qr}`;

    const wrongEach = [`${U}%`, `${p}%`, '1%'].filter((x) => x !== `${each}%`);
    const steps = [
      choice(rng, {
        prompt: `The whole bar is **100%**. Cut it into **${U}** equal units. What percent is 1 unit?`,
        options: [
          { label: `${each}%`, correct: true },
          ...wrongEach.slice(0, 2).map((label) => ({ label, tag: 'percent-base' })),
        ],
        hints: [`${U} equal units share 100%.`, `100% ÷ ${U} = ?`],
        explain: `100% ÷ ${U} = ${each}%, so each unit is ${each}%.`,
        work: `${U} units = 100% = ${fmt(base)} · 1 unit = ${each}%`,
      }),
      num({
        prompt: `What is **1 unit** (${each}%) of ${fmt(base)}?`,
        answer: u,
        traps: [
          { value: base / each, tag: 'percent-base' },
          { value: base / 100, tag: 'place-value' },
          { value: base / (U * 10), tag: 'place-value' },
          { value: base * U, tag: 'wrong-operation' },
        ],
        hints: [`${fmt(base)} ÷ ${U} = ?`],
        explain: `${fmt(base)} ÷ ${U} = ${fmt(u)}.`,
        work: `1 unit = ${fmt(base)} ÷ ${U} = ${fmt(u)}`,
      }),
      num({
        prompt: ask === 'part' ? c.qp : c.qr,
        answer,
        traps: [
          { value: ask === 'part' ? rest : part, tag: 'fraction-complement' },
          { value: p, tag: 'percent-base' },
          { value: u, tag: 'stopped-early' },
          { value: base * p, tag: 'place-value' },
        ],
        hints:
          ask === 'part'
            ? [`${p}% is ${pu} units of ${each}%.`, `${pu} × ${fmt(u)} = ?`]
            : [`${100 - p}% is ${U - pu} units.`, `${U - pu} × ${fmt(u)} = ?`],
        explain: ask === 'part' ? `${pu} × ${fmt(u)} = ${fmt(part)}.` : `${U - pu} × ${fmt(u)} = ${fmt(rest)}.`,
        work: ask === 'part' ? `${p}% = ${pu} × ${fmt(u)} = ${fmt(part)}` : `${100 - p}% = ${U - pu} × ${fmt(u)} = ${fmt(rest)}`,
      }),
    ];

    const L = 8 / U;
    const scene = (k) => {
      const s = { rows: [], braces: [] };
      if (k < 1) return s;
      const segs = units('u', U, L, 'a', k >= 2 && U <= 10 ? fmt(u) : '');
      if (k >= 3) {
        segs.forEach((g, i) => {
          const inPart = i < pu;
          g.cls = (ask === 'part') === inPart ? 'ans' : inPart ? 's' : 'a';
        });
      }
      s.rows.push({ id: 'w', label: '100%', segs });
      s.braces.push({ id: 'tot', type: 'top', row: 'w', from: 'u1', to: `u${U}`, text: `${fmt(base)} ${c.whole}`, sub: '100%' });
      if (k >= 2 && U > 10) {
        s.braces.push({ id: 'one', type: 'bottom', row: 'w', from: 'u1', to: 'u1', text: fmt(u), sub: `${each}%`, level: 0 });
      }
      if (k >= 3) {
        const askPart = ask === 'part';
        s.braces.push({
          id: 'pt',
          type: 'bottom',
          row: 'w',
          from: askPart ? 'u1' : `u${pu + 1}`,
          to: askPart ? `u${pu}` : `u${U}`,
          text: fmt(answer),
          sub: `${askPart ? p : 100 - p}%`,
          cls: 'ans',
          level: U > 10 ? 1 : 0,
        });
      }
      return s;
    };

    return { text, answer, answerText: `${fmt(answer)} ${c.whole} ${ask === 'part' ? c.part : c.rest}.`, steps, scene };
  },
};
