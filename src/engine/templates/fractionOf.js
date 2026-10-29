import { fmt, money, gcd, NAMES } from '../util.js';
import { units, choice, num } from '../build.js';

const THINGS = ['bag', 'pair of shoes', 'watch', 'board game', 'jacket'];

function context(kind, name, thing) {
  if (kind === 'money') {
    return {
      fmtV: money,
      prefix: '$',
      intro: (whole, n, d) => `${name} had **${money(whole)}**. ${name} spent **{${n}/${d}}** of the money on a ${thing}.`,
      partName: 'spent',
      restName: 'left',
      qPart: 'How much money was spent?',
      qRest: 'How much money was left?',
      partLabel: 'Spent',
      restLabel: 'Left',
      wholeLabel: (whole) => money(whole),
      ansPart: (v) => `${money(v)} was spent.`,
      ansRest: (v) => `${money(v)} was left.`,
    };
  }
  return {
    fmtV: fmt,
    prefix: '',
    intro: (whole, n, d) => `There are **${fmt(whole)}** students in a hall. **{${n}/${d}}** of them are wearing sports shoes.`,
    partName: 'wearing sports shoes',
    restName: 'not wearing sports shoes',
    qPart: 'How many students are wearing sports shoes?',
    qRest: 'How many students are not wearing sports shoes?',
    partLabel: 'Sports shoes',
    restLabel: 'Others',
    wholeLabel: (whole) => `${fmt(whole)} students`,
    ansPart: (v) => `${fmt(v)} students are wearing sports shoes.`,
    ansRest: (v) => `${fmt(v)} students are not wearing sports shoes.`,
  };
}

export default {
  id: 'frac',
  name: 'Fraction of a quantity',
  unitId: 'u2',
  blurb: 'Find a fraction of an amount by cutting the bar into equal units.',
  heuristic: 'The denominator says how many units. Find 1 unit, then take the numerator.',
  fields: [
    { key: 'n', label: 'Numerator', min: 1, max: 11 },
    { key: 'd', label: 'Denominator', min: 2, max: 12 },
    { key: 'whole', label: 'Whole amount', min: 2, max: 1000000 },
  ],

  generate(rng) {
    const d = rng.pick([3, 4, 5, 6, 8, 10]);
    let n = rng.int(1, d - 1);
    while (gcd(n, d) !== 1) n = rng.int(1, d - 1);
    const kind = rng.pick(['money', 'people']);
    const u = kind === 'money' ? rng.int(4, 60) * 5 : rng.int(6, 40);
    return { n, d, whole: d * u, kind, name: rng.pick(NAMES), thing: rng.int(0, THINGS.length - 1), ask: rng.pick(['part', 'rest']) };
  },

  validate({ n, d, whole }) {
    if (n >= d) return 'The numerator must be smaller than the denominator.';
    if (whole % d !== 0) return `The whole must divide evenly by ${d}.`;
    return null;
  },

  build({ n, d, whole, kind = 'money', name = 'Sam', thing = 0, ask = 'part' }, rng) {
    const c = context(kind, name, THINGS[thing % THINGS.length]);
    const u = whole / d;
    const part = n * u;
    const rest = (d - n) * u;
    const answer = ask === 'part' ? part : rest;
    const text = `${c.intro(whole, n, d)} ${ask === 'part' ? c.qPart : c.qRest}`;

    const steps = [
      choice(rng, {
        prompt: `To show {${n}/${d}}, how many **equal units** should the whole bar have?`,
        options: [
          { label: `${d} units`, correct: true },
          ...(n > 1 ? [{ label: `${n} units`, tag: 'fraction-parts' }] : [{ label: '1 unit', tag: 'fraction-parts' }]),
          { label: `${n + d} units`, tag: 'fraction-parts' },
        ],
        hints: ['The bottom number of a fraction tells how many equal parts make the whole.'],
        explain: `Cut the whole bar into ${d} equal units. Each unit is {1/${d}}.`,
        work: `Whole = ${d} units = ${c.wholeLabel(whole)}`,
      }),
      choice(rng, {
        prompt: `How many of those units are **${c.partName}**?`,
        options: [
          { label: `${n}`, correct: true },
          { label: `${d - n}`, tag: 'fraction-complement' },
          { label: `${d}`, tag: 'unit-count' },
        ].filter((o, i, all) => all.findIndex((p) => p.label === o.label) === i),
        hints: [`The top number of {${n}/${d}} says how many units to shade.`],
        explain: `{${n}/${d}} means ${n} of the ${d} units.`,
        work: `${c.partLabel} = ${n} units`,
      }),
      num({
        prompt: 'What is **1 unit**?',
        prefix: c.prefix,
        answer: u,
        traps: [
          { value: whole / n, tag: 'fraction-parts' },
          { value: whole * d, tag: 'wrong-operation' },
          { value: whole / (d - n), tag: 'fraction-complement' },
        ],
        hints: [`${d} equal units share ${c.wholeLabel(whole)}.`, `${fmt(whole)} ÷ ${d} = ?`],
        explain: `${fmt(whole)} ÷ ${d} = ${fmt(u)}.`,
        work: `1 unit = ${fmt(whole)} ÷ ${d} = ${c.fmtV(u)}`,
      }),
      num({
        prompt: ask === 'part' ? c.qPart : c.qRest,
        prefix: c.prefix,
        answer,
        traps: [
          { value: ask === 'part' ? rest : part, tag: 'fraction-complement' },
          { value: u, tag: 'stopped-early' },
          { value: whole, tag: 'wrong-whole' },
        ],
        hints:
          ask === 'part'
            ? [`${c.partLabel} is ${n} units.`, `${n} × ${fmt(u)} = ?`]
            : [`${c.restLabel} is the ${d - n} unshaded units.`, `${d - n} × ${fmt(u)} = ?`],
        explain:
          ask === 'part'
            ? `${n} × ${fmt(u)} = ${fmt(part)}.`
            : `${d - n} × ${fmt(u)} = ${fmt(rest)}.`,
        work:
          ask === 'part'
            ? `${c.partLabel} = ${n} × ${fmt(u)} = ${c.fmtV(part)}`
            : `${c.restLabel} = ${d - n} × ${fmt(u)} = ${c.fmtV(rest)}`,
      }),
    ];

    const L = Math.min(1.25, 8 / d);
    const scene = (k) => {
      const s = { rows: [], braces: [] };
      if (k < 1) return s;
      const t = k >= 3 ? c.fmtV(u) : '';
      const segs = units('u', d, L, 'a', t);
      if (k >= 2) for (let i = 0; i < n; i++) segs[i].cls = 's';
      if (k >= 4) {
        const from = ask === 'part' ? 0 : n;
        const to = ask === 'part' ? n : d;
        for (let i = from; i < to; i++) segs[i].cls = 'ans';
      }
      s.rows.push({ id: 'w', label: 'Whole', segs });
      s.braces.push({ id: 'tot', type: 'top', row: 'w', from: 'u1', to: `u${d}`, text: c.wholeLabel(whole) });
      if (k >= 2) {
        s.braces.push({ id: 'pt', type: 'bottom', row: 'w', from: 'u1', to: `u${n}`, text: k >= 4 && ask === 'part' ? c.fmtV(part) : c.partLabel, cls: k >= 4 && ask === 'part' ? 'ans' : '' });
        s.braces.push({ id: 'rs', type: 'bottom', row: 'w', from: `u${n + 1}`, to: `u${d}`, text: k >= 4 && ask === 'rest' ? c.fmtV(rest) : c.restLabel, cls: k >= 4 && ask === 'rest' ? 'ans' : '' });
      }
      return s;
    };

    return { text, answer, answerText: ask === 'part' ? c.ansPart(part) : c.ansRest(rest), steps, scene };
  },
};
