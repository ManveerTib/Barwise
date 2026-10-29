import { fmt } from '../util.js';
import { units, choice, num } from '../build.js';

const CONTEXTS = [
  { thing: 'printer', amount: 'pages', one: 'page', verb: 'prints', time: 'minute', times: 'minutes', abbr: 'min' },
  { thing: 'water pump', amount: 'litres', one: 'litre', verb: 'pumps', time: 'minute', times: 'minutes', abbr: 'min' },
  { thing: 'factory machine', amount: 'bottles', one: 'bottle', verb: 'packs', time: 'hour', times: 'hours', abbr: 'h' },
  { thing: 'bakery', amount: 'loaves', one: 'loaf', verb: 'bakes', time: 'day', times: 'days', abbr: 'day' },
];

export default {
  id: 'rate',
  name: 'Rate and the unitary method',
  unitId: 'u3',
  blurb: 'Find the amount for 1 unit of time, then scale up to any time.',
  heuristic: 'Find 1, then multiply.',
  fields: [
    { key: 't1', label: 'Time given', min: 2, max: 12 },
    { key: 'r', label: 'Amount per 1 unit of time', min: 1, max: 100000 },
    { key: 't2', label: 'Time asked about', min: 1, max: 12 },
  ],

  generate(rng) {
    const t1 = rng.int(2, 6);
    let t2 = rng.int(3, 12);
    while (t2 === t1) t2 = rng.int(3, 12);
    return { t1, r: rng.int(6, 60), t2, ctx: rng.int(0, CONTEXTS.length - 1) };
  },

  validate({ t1, t2 }) {
    if (t1 === t2) return 'Use a different time in the question.';
    return null;
  },

  build({ t1, r, t2, ctx = 0 }, rng) {
    const c = CONTEXTS[ctx % CONTEXTS.length];
    const given = t1 * r;
    const answer = t2 * r;
    const lbl = (n) => `${n} ${c.abbr === 'day' ? (n === 1 ? 'day' : 'days') : c.abbr}`;
    const text =
      `A ${c.thing} ${c.verb} **${fmt(given)}** ${c.amount} in **${t1} ${c.times}**. ` +
      `At the same rate, how many ${c.amount} does it ${c.verb.replace(/s$/, '')} in **${t2} ${t2 === 1 ? c.time : c.times}**?`;

    const steps = [
      choice(rng, {
        prompt: `Draw ${t1} equal units, one for each ${c.time}. What does **1 unit** stand for?`,
        options: [
          { label: `The ${c.amount} in 1 ${c.time}`, correct: true },
          { label: `Just 1 ${c.one}`, tag: 'rate-unit' },
          { label: `All ${t1} ${c.times}`, tag: 'rate-unit' },
        ],
        hints: [`Each unit matches one ${c.time} of work.`],
        explain: `Each unit is what the ${c.thing} does in 1 ${c.time}.`,
        work: `${t1} units = ${fmt(given)} ${c.amount}`,
      }),
      num({
        prompt: `How many ${c.amount} in **1 ${c.time}**?`,
        answer: r,
        traps: [
          { value: given * t1, tag: 'wrong-operation' },
          { value: given - t1, tag: 'rate-unit' },
          { value: t1 / given, tag: 'rate-unit' },
        ],
        hints: [`${t1} equal units share ${fmt(given)}.`, `${fmt(given)} ÷ ${t1} = ?`],
        explain: `${fmt(given)} ÷ ${t1} = ${fmt(r)} in 1 ${c.time}.`,
        work: `1 ${c.time} = ${fmt(given)} ÷ ${t1} = ${fmt(r)}`,
      }),
      num({
        prompt: `How many ${c.amount} in **${t2} ${t2 === 1 ? c.time : c.times}**?`,
        answer,
        traps: [
          { value: r, tag: 'stopped-early' },
          { value: given * t2, tag: 'rate-unit' },
          { value: given + (t2 - t1), tag: 'rate-unit' },
          { value: given, tag: 'stopped-early' },
        ],
        hints: [`Draw ${t2} units of ${fmt(r)}.`, `${t2} × ${fmt(r)} = ?`],
        explain: `${t2} × ${fmt(r)} = ${fmt(answer)}.`,
        work: `${t2} ${t2 === 1 ? c.time : c.times} = ${t2} × ${fmt(r)} = ${fmt(answer)}`,
      }),
    ];

    const L = Math.min(1.2, 8.4 / Math.max(t1, t2));
    const scene = (k) => {
      const s = { rows: [], braces: [] };
      if (k < 1) return s;
      const t = k >= 2 ? fmt(r) : '';
      s.rows.push({ id: 'g', label: lbl(t1), segs: units('g', t1, L, 'a', t) });
      s.braces.push({ id: 'giv', type: 'top', row: 'g', from: 'g1', to: `g${t1}`, text: fmt(given) });
      if (k >= 2) {
        s.rows.push({ id: 'q', label: lbl(t2), segs: units('q', t2, L, k >= 3 ? 'ans' : 'b', fmt(r)) });
        s.braces.push({ id: 'qa', type: 'end', row: 'q', text: k >= 3 ? `= ${fmt(answer)}` : '= ?', cls: k >= 3 ? 'ans' : 'q' });
      }
      return s;
    };

    return { text, answer, answerText: `It ${c.verb} ${fmt(answer)} ${c.amount} in ${t2} ${t2 === 1 ? c.time : c.times}.`, steps, scene };
  },
};
