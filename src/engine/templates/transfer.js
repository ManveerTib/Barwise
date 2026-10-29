import { fmt, twoNames, ITEMS, unitWord } from '../util.js';
import { seg, units, choice, num } from '../build.js';

export default {
  id: 'xfer',
  name: 'Before-and-after transfers',
  unitId: 'u4',
  blurb: 'Someone gives some away and the amounts become equal. The total stays the same.',
  heuristic: 'Draw before, move units across, and compare after.',
  fields: [
    { key: 'k', label: 'Times as many at first (3 or 5)', min: 3, max: 5 },
    { key: 'g', label: 'Amount given', min: 1, max: 100000 },
  ],

  generate(rng) {
    const k = rng.pick([3, 5]);
    const give = (k - 1) / 2;
    const [A, B] = twoNames(rng);
    return { k, g: give * rng.int(8, 60), A, B, item: rng.pick(ITEMS), ask: rng.pick(['big', 'small', 'total']) };
  },

  validate({ k, g }) {
    if (k !== 3 && k !== 5) return 'Use 3 or 5 so the units split evenly.';
    const give = (k - 1) / 2;
    if (g % give !== 0) return `The amount given must divide evenly by ${give}.`;
    return null;
  },

  build({ k, g, A = 'Ravi', B = 'Tom', item = 'cards', ask = 'big' }, rng) {
    const give = (k - 1) / 2;
    const u = g / give;
    const each = (k + 1) / 2;
    const answer = ask === 'big' ? k * u : ask === 'small' ? u : (k + 1) * u;
    const question =
      ask === 'total'
        ? `How many ${item} did they have altogether?`
        : `How many ${item} did ${ask === 'big' ? A : B} have at first?`;
    const text =
      `${A} had **${k} times** as many ${item} as ${B}. After ${A} gave **${fmt(g)}** ${item} to ${B}, ` +
      `they had the same number of ${item}. ${question}`;

    const steps = [
      choice(rng, {
        prompt: `Draw the **before** model. ${B} has 1 unit. How many units does ${A} have?`,
        options: [
          { label: `${k} units`, correct: true },
          { label: `${k + 1} units`, tag: 'unit-count' },
          { label: `${k - 1} units`, tag: 'unit-count' },
        ],
        hints: [`“${k} times as many” means ${k} units for every 1 unit ${B} has.`],
        explain: `Before: ${A} has ${k} units and ${B} has 1 unit, ${k + 1} units in all.`,
        work: `Before: ${A} ${k} units · ${B} 1 unit`,
      }),
      choice(rng, {
        prompt: `${A} gives units to ${B} until they are equal. The total stays ${k + 1} units. How many units must **move**?`,
        options: [
          { label: `${give} ${unitWord(give)}`, correct: true },
          { label: `${k - 1} units`, tag: 'transfer-double' },
          { label: `${each + 1} units`, tag: 'transfer-double' },
        ].filter((o, i, all) => all.findIndex((p) => p.label === o.label) === i),
        hints: [
          `After the gift, each person has half of ${k + 1} units.`,
          `Each ends with ${each} units, so ${A} goes from ${k} to ${each}.`,
        ],
        explain: `Each ends with ${each} units, so ${give} ${unitWord(give)} move from ${A} to ${B}.`,
        work: `After: each has ${each} units · ${give} ${unitWord(give)} moved`,
      }),
      num({
        prompt: give === 1 ? `The moved unit is the ${fmt(g)} ${item}. What is **1 unit**?` : `The ${give} moved units are the ${fmt(g)} ${item}. What is **1 unit**?`,
        answer: u,
        traps: [
          { value: g * give, tag: 'wrong-operation' },
          { value: g / (k - 1), tag: 'transfer-double' },
          { value: g / 2, tag: 'transfer-double' },
          { value: g, tag: 'unit-count' },
        ],
        hints: [`${give} ${unitWord(give)} = ${fmt(g)}.`, `${fmt(g)} ÷ ${give} = ?`],
        explain: `${fmt(g)} ÷ ${give} = ${fmt(u)}.`,
        work: `1 unit = ${fmt(g)} ÷ ${give} = ${fmt(u)}`,
      }),
    ];
    if (ask !== 'small') {
      steps.push(
        num({
          prompt: question,
          answer,
          traps:
            ask === 'big'
              ? [
                  { value: u, tag: 'stopped-early' },
                  { value: k * u - g, tag: 'before-after' },
                  { value: each * u, tag: 'before-after' },
                ]
              : [
                  { value: k * u, tag: 'stopped-early' },
                  { value: (k + 1) * u - g, tag: 'transfer-double' },
                  { value: (k + 1) * u + g, tag: 'transfer-double' },
                ],
          hints:
            ask === 'big'
              ? [`At first ${A} had ${k} units.`, `${k} × ${fmt(u)} = ?`]
              : [`The total is ${k + 1} units, before and after.`, `${k + 1} × ${fmt(u)} = ?`],
          explain: ask === 'big' ? `${k} × ${fmt(u)} = ${fmt(answer)}.` : `${k + 1} × ${fmt(u)} = ${fmt(answer)}.`,
          work: ask === 'big' ? `${A} at first = ${k} × ${fmt(u)} = ${fmt(answer)}` : `Total = ${k + 1} × ${fmt(u)} = ${fmt(answer)}`,
        })
      );
    }

    const n = steps.length;
    const scene = (kk) => {
      const s = { rows: [], braces: [] };
      if (kk < 1) return s;
      const t = kk >= 3 ? fmt(u) : '';
      const L = 1.25;
      const done = kk >= n;
      if (kk === 1) {
        s.rows.push({ id: 'A', label: A, segs: units('a', k, L, 'a') });
        s.rows.push({ id: 'B', label: B, segs: [seg('b1', L, 'b')] });
        s.caption = 'Before';
        return s;
      }
      const stay = units('a', k - give, L, 'a', t);
      const ghosts = units('gh', give, L, 'a', '', { ghost: true, enter: 'fade' });
      const moved = units('a', give, L, 'x', t, {}, k - give + 1);
      s.rows.push({ id: 'A', label: A, segs: [...stay, ...ghosts] });
      s.rows.push({ id: 'B', label: B, segs: [seg('b1', L, done && ask === 'small' ? 'ans' : 'b', t), ...moved] });
      s.caption = 'After: the dashed units moved to ' + B;
      if (kk >= 3) {
        s.braces.push({ id: 'mv', type: 'top', row: 'B', from: moved[0].id, to: moved[moved.length - 1].id, text: fmt(g), sub: 'given' });
      }
      if (done && ask === 'big') {
        s.braces.push({ id: 'ans', type: 'top', row: 'A', from: 'a1', to: `gh${give}`, text: `${fmt(answer)} at first`, cls: 'ans' });
      }
      if (done && ask === 'total') {
        s.braces.push({ id: 'ans', type: 'right', rows: ['A', 'B'], text: fmt(answer), sub: `${k + 1} units`, cls: 'ans' });
      }
      return s;
    };

    const whoAns = ask === 'total' ? `They had ${fmt(answer)} ${item} altogether.` : `${ask === 'big' ? A : B} had ${fmt(answer)} ${item} at first.`;
    return { text, answer, answerText: whoAns, steps, scene };
  },
};
