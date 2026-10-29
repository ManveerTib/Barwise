import { fmt, twoNames, ITEMS } from '../util.js';
import { seg, choice, num } from '../build.js';

export default {
  id: 'cmp',
  name: 'Comparison models',
  unitId: 'u1',
  blurb: 'One person has more than another, and you know the total.',
  heuristic: 'Remove the extra so the bars are equal, then divide.',
  fields: [
    { key: 'total', label: 'Total of both', min: 3, max: 1000000 },
    { key: 'diff', label: 'How many more the first person has', min: 1, max: 1000000 },
  ],

  generate(rng) {
    const small = rng.int(24, 180) * 5;
    const diff = rng.int(4, 60) * 5;
    const [A, B] = twoNames(rng);
    return { total: 2 * small + diff, diff, A, B, item: rng.pick(ITEMS), ask: rng.pick(['small', 'big']) };
  },

  validate({ total, diff }) {
    if (diff >= total) return 'The difference must be smaller than the total.';
    if ((total - diff) % 2 !== 0) return 'Total minus difference must be even so the two equal units are whole numbers.';
    return null;
  },

  build({ total, diff, A = 'Ali', B = 'Ben', item = 'stamps', ask = 'small' }, rng) {
    const small = (total - diff) / 2;
    const big = small + diff;
    const who = ask === 'big' ? A : B;
    const answer = ask === 'big' ? big : small;
    const text =
      `${A} and ${B} have **${fmt(total)}** ${item} altogether. ${A} has **${fmt(diff)}** more ${item} than ${B}. ` +
      `How many ${item} does ${who} have?`;

    const steps = [
      choice(rng, {
        prompt: 'Draw a bar for each person. Who gets the **shorter** bar?',
        options: [
          { label: B, correct: true },
          { label: A, tag: 'compare-direction' },
        ],
        hints: [`“${A} has ${fmt(diff)} more” tells you whose bar is longer.`],
        explain: `${B} has fewer, so ${B} gets 1 unit. ${A} gets 1 unit plus an extra ${fmt(diff)}.`,
        work: `${B}: 1 unit · ${A}: 1 unit + ${fmt(diff)}`,
      }),
      choice(rng, {
        prompt: `Where does **${fmt(total)}** go in the model?`,
        options: [
          { label: 'Around both bars together', correct: true },
          { label: `Around ${A}'s bar only`, tag: 'wrong-whole' },
          { label: 'On the extra part', tag: 'wrong-whole' },
        ],
        hints: [`“Altogether” means ${A} and ${B} combined.`],
        explain: `${fmt(total)} is everything both people have, so it brackets both bars.`,
        work: `Both bars = ${fmt(total)}`,
      }),
      num({
        prompt: `Take away the extra ${fmt(diff)} so the bars are equal. What do the **2 equal units** make?`,
        answer: total - diff,
        traps: [
          { value: total + diff, tag: 'wrong-operation' },
          { value: total / 2, tag: 'forgot-adjust' },
          {
            value: small,
            tag: 'none',
            feedback: 'That is 1 unit, which comes next. First find what the 2 units make together.',
          },
        ],
        hints: [
          `Cover the extra ${fmt(diff)} on ${A}'s bar. What is left of the ${fmt(total)}?`,
          `${fmt(total)} − ${fmt(diff)} = ?`,
        ],
        explain: `${fmt(total)} − ${fmt(diff)} = ${fmt(total - diff)}, so 2 units = ${fmt(total - diff)}.`,
        work: `2 units = ${fmt(total)} − ${fmt(diff)} = ${fmt(total - diff)}`,
      }),
      num({
        prompt: 'What is **1 unit**?',
        answer: small,
        traps: [
          { value: total / 2, tag: 'forgot-adjust' },
          { value: (total - diff) * 2, tag: 'wrong-operation' },
        ],
        hints: ['2 equal units share the amount evenly.', `${fmt(total - diff)} ÷ 2 = ?`],
        explain: `${fmt(total - diff)} ÷ 2 = ${fmt(small)}. ${B} has 1 unit.`,
        work: `1 unit = ${fmt(total - diff)} ÷ 2 = ${fmt(small)}`,
      }),
    ];
    if (ask === 'big') {
      steps.push(
        num({
          prompt: `How many ${item} does **${A}** have?`,
          answer: big,
          traps: [
            { value: small, tag: 'stopped-early' },
            { value: small - diff, tag: 'wrong-operation' },
          ],
          hints: [`${A} has 1 unit and the extra.`, `${fmt(small)} + ${fmt(diff)} = ?`],
          explain: `${fmt(small)} + ${fmt(diff)} = ${fmt(big)}.`,
          work: `${A} = ${fmt(small)} + ${fmt(diff)} = ${fmt(big)}`,
        })
      );
    }

    const n = steps.length;
    const scene = (k) => {
      const s = { rows: [], braces: [] };
      if (k < 1) return s;
      const unitText = k >= 4 ? fmt(small) : '1 unit';
      const extraGhost = k === 3 || (k >= 4 && ask === 'small');
      s.rows.push({
        id: 'A',
        label: A,
        segs: [
          seg('a1', 2.6, 'a', unitText),
          seg('ax', 1.3, 'x', fmt(diff), { ghost: extraGhost }),
        ],
      });
      s.rows.push({
        id: 'B',
        label: B,
        segs: [seg('b1', 2.6, k >= n && ask === 'small' ? 'ans' : 'b', unitText)],
      });
      if (k >= 2) {
        s.braces.push({
          id: 'tot',
          type: 'right',
          rows: ['A', 'B'],
          text: k >= 3 ? `${fmt(total)}` : fmt(total),
          sub: k >= 3 ? `2 units = ${fmt(total - diff)}` : '',
        });
      }
      if (k >= n && ask === 'big') {
        s.braces.push({ id: 'ansA', type: 'top', row: 'A', from: 'a1', to: 'ax', text: fmt(big), cls: 'ans' });
      }
      return s;
    };

    return {
      text,
      answer,
      answerText: `${who} has ${fmt(answer)} ${item}.`,
      steps,
      scene,
    };
  },
};
