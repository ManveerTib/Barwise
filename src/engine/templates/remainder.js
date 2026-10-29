import { fmt, money, NAMES, unitWord } from '../util.js';
import { seg, choice, num } from '../build.js';

// [a, b, c, d]: spend a/b first, then c/d of the remainder. Each pair is chosen
// so the remainder re-splits into exactly d small units (see `m` below).
const COMBOS = [
  [1, 3, 1, 4],
  [1, 2, 1, 3],
  [2, 5, 1, 3],
  [1, 4, 1, 3],
  [1, 3, 1, 2],
  [1, 5, 1, 4],
  [2, 5, 2, 3],
  [1, 4, 2, 3],
  [1, 3, 3, 4],
];
const BUYS = [
  ['book', 'pen'],
  ['shirt', 'cap'],
  ['toy', 'snack'],
  ['game', 'comic'],
];

export default {
  id: 'rem',
  name: 'Fraction of a remainder',
  unitId: 'u2',
  blurb: 'Two-step fraction problems where the second fraction is of what is left.',
  heuristic: 'Bracket the remainder and re-split only that part into equal units.',
  fields: [
    { key: 'combo', label: 'Fractions', type: 'combo', options: COMBOS.map((c, i) => ({ value: i, label: `${c[0]}/${c[1]} then ${c[2]}/${c[3]} of the rest` })) },
    { key: 'left', label: 'Money left at the end ($)', min: 1, max: 1000000 },
  ],

  generate(rng) {
    const combo = rng.int(0, COMBOS.length - 1);
    const [, , c, d] = COMBOS[combo];
    const u = rng.int(3, 30) * 5;
    return { combo, left: (d - c) * u, name: rng.pick(NAMES), buy: rng.int(0, BUYS.length - 1) };
  },

  validate({ combo, left }) {
    const [, , c, d] = COMBOS[combo] || COMBOS[0];
    if (left % (d - c) !== 0) return `The money left must divide evenly by ${d - c}.`;
    return null;
  },

  build({ combo = 0, left, name = 'Jia', buy = 0 }, rng) {
    const [a, b, c, d] = COMBOS[combo % COMBOS.length];
    const [t1, t2] = BUYS[buy % BUYS.length];
    const m = d / (b - a); // small units in each of the b big parts
    const N = b * m; // small units in the whole bar
    const firstUnits = a * m;
    const leftUnits = d - c;
    const u = left / leftUnits;
    const total = N * u;

    const text =
      `${name} had some money. ${name} spent **{${a}/${b}}** of it on a ${t1} and **{${c}/${d}}** of the remainder on a ${t2}. ` +
      `${name} had **${money(left)}** left. How much money did ${name} have at first?`;

    const steps = [
      choice(rng, {
        prompt: `Draw one bar for all the money. Into how many equal parts do you cut it to show the ${t1}?`,
        options: [
          { label: `${b} parts`, correct: true },
          { label: `${a === 1 ? b + 1 : a} parts`, tag: 'fraction-parts' },
          { label: `${b + d} parts`, tag: 'fraction-parts' },
        ],
        hints: [`The ${t1} is {${a}/${b}} of the money. The bottom number gives the parts.`],
        explain: `${b} equal parts, and the ${t1} takes ${a} of them.`,
        work: `${t1[0].toUpperCase() + t1.slice(1)} = ${a} of ${b} parts`,
      }),
      choice(rng, {
        prompt: `The ${t2} costs {${c}/${d}} of **what**?`,
        options: [
          { label: `The money left after the ${t1}`, correct: true },
          { label: 'All the money at first', tag: 'fraction-wrong-whole' },
          { label: `The ${t1}'s price`, tag: 'fraction-wrong-whole' },
        ],
        hints: ['Read the words after the fraction: “of the remainder”.'],
        explain: `The remainder is re-split into ${d} equal units, and the ${t2} takes ${c} of them.`,
        work: `Remainder = ${d} units · ${t2} = ${c} ${unitWord(c)}`,
      }),
      num({
        prompt: `The remainder has ${d} units and the ${t2} uses ${c}. How many units are **left**?`,
        answer: leftUnits,
        suffix: 'units',
        traps: [
          { value: c, tag: 'fraction-complement' },
          { value: d, tag: 'unit-count' },
        ],
        hints: [`${d} − ${c} = ?`],
        explain: `${d} − ${c} = ${leftUnits} ${unitWord(leftUnits)} are left.`,
        work: `Left = ${leftUnits} ${unitWord(leftUnits)} = ${money(left)}`,
      }),
      num({
        prompt: leftUnits === 1 ? `The 1 unit left is ${money(left)}. What is **1 unit**?` : `${leftUnits} units = ${money(left)}. What is **1 unit**?`,
        prefix: '$',
        answer: u,
        traps: [
          { value: left * leftUnits, tag: 'wrong-operation' },
          { value: left / d, tag: 'unit-count' },
          { value: left / c, tag: 'fraction-complement' },
        ],
        hints: [`${money(left)} ÷ ${leftUnits} = ?`],
        explain: `${fmt(left)} ÷ ${leftUnits} = ${fmt(u)}.`,
        work: `1 unit = ${money(left)} ÷ ${leftUnits} = ${money(u)}`,
      }),
      num({
        prompt: 'Count every unit in the **whole bar**, including the first part. How many units are there?',
        answer: N,
        suffix: 'units',
        traps: [
          { value: b, tag: 'unit-count' },
          { value: d, tag: 'fraction-wrong-whole' },
          { value: b + d, tag: 'unit-count' },
          { value: b * d, tag: 'unit-count' },
        ],
        hints: [`Each of the ${b} parts is now ${m} small ${unitWord(m)}.`, `${b} × ${m} = ?`],
        explain: `${b} parts × ${m} = ${N} units in the whole bar.`,
        work: `Whole = ${b} × ${m} = ${N} units`,
      }),
      num({
        prompt: `How much money did ${name} have **at first**?`,
        prefix: '$',
        answer: total,
        traps: [
          { value: d * u, tag: 'fraction-wrong-whole' },
          { value: left, tag: 'stopped-early' },
          { value: u, tag: 'stopped-early' },
          { value: b * u, tag: 'unit-count' },
        ],
        hints: [`The whole bar is ${N} units.`, `${N} × ${money(u)} = ?`],
        explain: `${N} × ${fmt(u)} = ${fmt(total)}.`,
        work: `At first = ${N} × ${money(u)} = ${money(total)}`,
      }),
    ];

    const L = Math.min(1.3, 7.2 / N);
    const BL = (N / b) * L; // a big part's length, so both views fill the same width
    const scene = (k) => {
      const s = { rows: [], braces: [] };
      if (k < 1) return s;
      if (k === 1) {
        const segs = Array.from({ length: b }, (_, i) => seg(`p${i + 1}`, BL, i < a ? 's' : 'a', i < a ? t1 : ''));
        s.rows.push({ id: 'w', label: 'At first', segs });
        s.braces.push({ id: 'tot', type: 'top', row: 'w', from: 'p1', to: `p${b}`, text: '?', cls: 'q' });
        return s;
      }
      const t = k >= 4 ? money(u) : '';
      const segs = Array.from({ length: N }, (_, i) => {
        let cls = 'a';
        if (i < firstUnits) cls = 's';
        else if (i < firstUnits + c) cls = k >= 3 ? 's2' : 'a';
        else if (k >= 3) cls = 'b';
        return seg(`s${i + 1}`, L, cls, t, { enter: 'split' });
      });
      s.rows.push({ id: 'w', label: 'At first', segs });
      s.braces.push({
        id: 'tot',
        type: 'top',
        row: 'w',
        from: 's1',
        to: `s${N}`,
        text: k >= 6 ? money(total) : k >= 5 ? `${N} units` : '?',
        cls: k >= 6 ? 'ans' : k >= 5 ? '' : 'q',
      });
      s.braces.push({ id: 'b1', type: 'bottom', row: 'w', from: 's1', to: `s${firstUnits}`, text: t1 });
      if (k === 2) {
        s.braces.push({ id: 'rm', type: 'bottom', row: 'w', from: `s${firstUnits + 1}`, to: `s${N}`, text: `remainder · ${d} units` });
      } else {
        s.braces.push({ id: 'b2', type: 'bottom', row: 'w', from: `s${firstUnits + 1}`, to: `s${firstUnits + c}`, text: t2 });
        s.braces.push({ id: 'lf', type: 'bottom', row: 'w', from: `s${firstUnits + c + 1}`, to: `s${N}`, text: money(left) });
      }
      return s;
    };

    return { text, answer: total, answerText: `${name} had ${money(total)} at first.`, steps, scene };
  },
};
