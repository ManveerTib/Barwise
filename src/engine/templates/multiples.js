import { fmt, twoNames, ITEMS, unitWord } from '../util.js';
import { units, choice, num } from '../build.js';

const times = (k) => (k === 2 ? 'twice' : `${k} times`);

export default {
  id: 'mul',
  name: 'Multiple-unit models',
  unitId: 'u1',
  blurb: 'One amount is a number of times another. Count units, find 1 unit, then scale.',
  heuristic: 'Give the smaller amount 1 unit and count every unit.',
  fields: [
    { key: 'k', label: 'How many times as many', min: 2, max: 9 },
    { key: 'u', label: 'Value of 1 unit', min: 1, max: 100000 },
  ],

  generate(rng) {
    const [A, B] = twoNames(rng);
    return {
      k: rng.pick([2, 3, 4, 5]),
      u: rng.int(3, 48) * 5,
      mode: rng.pick(['total', 'diff']),
      A,
      B,
      item: rng.pick(ITEMS),
      ask: rng.pick(['big', 'small']),
    };
  },

  validate({ k }) {
    if (k < 2 || k > 9) return 'Pick between 2 and 9 times as many.';
    return null;
  },

  build({ k, u, mode = 'total', A = 'Mei', B = 'Lin', item = 'beads', ask = 'big' }, rng) {
    const total = (k + 1) * u;
    const diff = (k - 1) * u;
    const known = mode === 'total' ? total : diff;
    const who = ask === 'big' ? A : B;
    const answer = ask === 'big' ? k * u : u;
    const fact =
      mode === 'total'
        ? `They have **${fmt(total)}** ${item} altogether.`
        : `${A} has **${fmt(diff)}** more ${item} than ${B}.`;
    const text = `${A} has **${times(k)}** as many ${item} as ${B}. ${fact} How many ${item} does ${who} have?`;
    const unitsKnown = mode === 'total' ? k + 1 : k - 1;

    const steps = [
      choice(rng, {
        prompt: `${B} gets 1 unit. How many units does **${A}** get?`,
        options: [
          { label: `${k} units`, correct: true },
          { label: `${k + 1} units`, tag: 'unit-count' },
          { label: '1 unit', tag: 'compare-direction' },
        ],
        hints: [`“${times(k)} as many” means ${A}'s bar is ${k} of ${B}'s units long.`],
        explain: `${A} has ${k} units and ${B} has 1 unit.`,
        work: `${A}: ${k} units · ${B}: 1 unit`,
      }),
      num({
        prompt:
          mode === 'total'
            ? 'How many units are there **altogether**?'
            : `How many units **more** does ${A} have than ${B}?`,
        answer: unitsKnown,
        suffix: 'units',
        traps:
          mode === 'total'
            ? [{ value: k, tag: 'unit-count' }]
            : [
                { value: k, tag: 'unit-count' },
                { value: k + 1, tag: 'unit-count' },
              ],
        hints:
          mode === 'total'
            ? ['Count the units in both bars.', `${k} + 1 = ?`]
            : [`Line the bars up. How many of ${A}'s units stick out past ${B}'s bar?`, `${k} − 1 = ?`],
        explain:
          mode === 'total'
            ? `${k} + 1 = ${k + 1} units make ${fmt(total)}.`
            : `${k} − 1 = ${k - 1} ${unitWord(k - 1)} make the difference of ${fmt(diff)}.`,
        work: `${unitsKnown} ${unitWord(unitsKnown)} = ${fmt(known)}`,
      }),
      num({
        prompt: `What is **1 unit**?`,
        answer: u,
        traps:
          mode === 'total'
            ? [
                { value: total / k, tag: 'unit-count' },
                { value: total * (k + 1), tag: 'wrong-operation' },
              ]
            : [
                { value: diff / k, tag: 'unit-count' },
                { value: diff / (k + 1), tag: 'unit-count' },
                { value: diff * (k - 1), tag: 'wrong-operation' },
              ],
        hints: [`${unitsKnown} equal units share ${fmt(known)}.`, `${fmt(known)} ÷ ${unitsKnown} = ?`],
        explain: `${fmt(known)} ÷ ${unitsKnown} = ${fmt(u)}.`,
        work: `1 unit = ${fmt(known)} ÷ ${unitsKnown} = ${fmt(u)}`,
      }),
    ];
    if (ask === 'big') {
      steps.push(
        num({
          prompt: `How many ${item} does **${A}** have?`,
          answer: k * u,
          traps: [
            { value: u, tag: 'stopped-early' },
            { value: known, tag: 'wrong-whole' },
            { value: (k + 1) * u, tag: 'unit-count' },
          ],
          hints: [`${A} has ${k} units.`, `${k} × ${fmt(u)} = ?`],
          explain: `${k} × ${fmt(u)} = ${fmt(k * u)}.`,
          work: `${A} = ${k} × ${fmt(u)} = ${fmt(k * u)}`,
        })
      );
    }

    const n = steps.length;
    const scene = (kk) => {
      const s = { rows: [], braces: [] };
      if (kk < 1) return s;
      const t = kk >= 3 ? fmt(u) : '';
      const done = kk >= n;
      s.rows.push({ id: 'A', label: A, segs: units('a', k, 1.3, done && ask === 'big' ? 'ans' : 'a', t) });
      s.rows.push({ id: 'B', label: B, segs: units('b', 1, 1.3, done && ask === 'small' ? 'ans' : 'b', t) });
      if (kk >= 2) {
        if (mode === 'total') {
          s.braces.push({ id: 'tot', type: 'right', rows: ['A', 'B'], text: fmt(total), sub: `${k + 1} units` });
        } else {
          s.braces.push({ id: 'dif', type: 'top', row: 'A', from: 'a2', to: `a${k}`, text: fmt(diff), sub: `${k - 1} ${unitWord(k - 1)}` });
        }
      }
      if (done && ask === 'big') {
        if (mode === 'total') s.braces.push({ id: 'ans', type: 'top', row: 'A', from: 'a1', to: `a${k}`, text: fmt(k * u), cls: 'ans' });
        else s.braces.push({ id: 'ans', type: 'end', row: 'A', text: `= ${fmt(k * u)}`, cls: 'ans' });
      }
      return s;
    };

    return { text, answer, answerText: `${who} has ${fmt(answer)} ${item}.`, steps, scene };
  },
};
