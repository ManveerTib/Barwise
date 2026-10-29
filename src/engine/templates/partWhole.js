import { fmt } from '../util.js';
import { seg, choice, num } from '../build.js';

const CONTEXTS = [
  { place: 'bookshop', many: 'pens', verb: 'sold' },
  { place: 'cinema', many: 'tickets', verb: 'sold' },
  { place: 'farm', many: 'apples', verb: 'packed' },
  { place: 'library', many: 'books', verb: 'lent out' },
  { place: 'bakery', many: 'buns', verb: 'sold' },
];

export default {
  id: 'pw',
  name: 'Part-whole models',
  unitId: 'u1',
  blurb: 'A whole is split into parts. Join the known parts, then find the missing one.',
  heuristic: 'Draw the whole first, then cut it into its parts.',
  fields: [
    { key: 'start', label: 'Amount at first', min: 10, max: 1000000 },
    { key: 'a', label: 'Taken on Monday', min: 1, max: 1000000 },
    { key: 'b', label: 'Taken on Tuesday', min: 1, max: 1000000 },
  ],

  generate(rng) {
    const start = rng.int(12, 48) * 100 + rng.pick([0, 50]);
    const a = Math.round((start * (0.18 + rng.next() * 0.2)) / 5) * 5;
    const b = Math.round((start * (0.18 + rng.next() * 0.2)) / 5) * 5;
    return { start, a, b, ctx: rng.int(0, CONTEXTS.length - 1) };
  },

  validate({ start, a, b }) {
    if (a + b >= start) return 'Monday and Tuesday together must be less than the amount at first.';
    return null;
  },

  build({ start, a, b, ctx = 0 }, rng) {
    const c = CONTEXTS[ctx % CONTEXTS.length];
    const left = start - a - b;
    const L = 6; // drawn length of the whole bar
    const la = Math.max(0.9, (a / start) * L);
    const lb = Math.max(0.9, (b / start) * L);
    const ll = Math.max(0.9, L - la - lb);

    const text =
      `A ${c.place} had **${fmt(start)}** ${c.many}. It ${c.verb} **${fmt(a)}** ${c.many} on Monday ` +
      `and **${fmt(b)}** ${c.many} on Tuesday. How many ${c.many} were left?`;

    const steps = [
      choice(rng, {
        prompt: 'Start with the whole. What should the **whole bar** stand for?',
        options: [
          { label: `All ${fmt(start)} ${c.many} at first`, correct: true },
          { label: `The ${c.many} ${c.verb} on Monday`, tag: 'wrong-whole' },
          { label: `The ${c.many} that were left`, tag: 'wrong-whole' },
        ],
        hints: [
          `The whole is the biggest amount in the story: everything before any ${c.many} were ${c.verb}.`,
          `It is the ${fmt(start)} ${c.many} the ${c.place} had at first.`,
        ],
        explain: `The whole bar is the ${fmt(start)} ${c.many} at first. Everything else is a part of it.`,
        work: `Whole = ${fmt(start)}`,
      }),
      num({
        prompt: `The bar splits into Monday, Tuesday and what is left. How many ${c.many} were ${c.verb} **altogether** on the two days?`,
        answer: a + b,
        traps: [{ value: Math.abs(a - b), tag: 'wrong-operation' }],
        hints: [
          'Both days are parts that were taken from the whole. Join them first.',
          `${fmt(a)} + ${fmt(b)} = ?`,
        ],
        explain: `${fmt(a)} + ${fmt(b)} = ${fmt(a + b)} ${c.many} were ${c.verb}.`,
        work: `${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}`,
      }),
      num({
        prompt: `How many ${c.many} were **left**?`,
        answer: left,
        traps: [
          { value: start + a + b, tag: 'wrong-operation' },
          { value: a + b, tag: 'stopped-early' },
          { value: start - a, tag: 'stopped-early' },
        ],
        hints: [
          'The part that is left = the whole − the parts that were taken.',
          `${fmt(start)} − ${fmt(a + b)} = ?`,
        ],
        explain: `${fmt(start)} − ${fmt(a + b)} = ${fmt(left)}.`,
        work: `${fmt(start)} − ${fmt(a + b)} = ${fmt(left)}`,
      }),
    ];

    const scene = (k) => {
      const s = { rows: [], braces: [] };
      if (k < 1) return s;
      if (k === 1) {
        s.rows.push({ id: 'r', label: 'At first', segs: [seg('w', L, 'a')] });
        s.braces.push({ id: 'tot', type: 'top', row: 'r', from: 'w', to: 'w', text: fmt(start) });
        return s;
      }
      s.rows.push({
        id: 'r',
        label: 'At first',
        segs: [
          seg('mon', la, 'x', fmt(a), { enter: 'split', sub: 'Mon' }),
          seg('tue', lb, 's2', fmt(b), { enter: 'split', sub: 'Tue' }),
          seg('left', ll, k >= 3 ? 'ans' : 'q', k >= 3 ? fmt(left) : '?', { enter: 'split', sub: 'Left' }),
        ],
      });
      s.braces.push({ id: 'tot', type: 'top', row: 'r', from: 'mon', to: 'left', text: fmt(start) });
      s.braces.push({ id: 'sold', type: 'bottom', row: 'r', from: 'mon', to: 'tue', text: `${fmt(a + b)} ${c.verb}` });
      return s;
    };

    return {
      text,
      answer: left,
      answerText: `${fmt(left)} ${c.many} were left.`,
      steps,
      scene,
    };
  },
};
