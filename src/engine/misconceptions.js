// Error patterns the app can recognize. Every wrong answer choice and every
// predicted wrong number in a template carries one of these tags.
//  student: what the learner sees right after the mistake
//  tutor:   what the tutor dashboard suggests doing about it

export const MISCONCEPTIONS = {
  'wrong-whole': {
    name: 'Mixes up the whole and a part',
    student: 'Check which amount covers everything in the story. The whole is the total, not one piece of it.',
    tutor: 'Before any numbers, have the student point to the whole bar and say what it stands for.',
  },
  'wrong-operation': {
    name: 'Chooses the wrong operation',
    student: 'Look at the model. Joining parts means add, taking a part away means subtract, and sharing into equal units means divide.',
    tutor: 'Ask “Should the answer be bigger or smaller than the whole?” before the student calculates.',
  },
  'unit-count': {
    name: 'Miscounts units',
    student: 'Count the units in the model one by one, across every bar the question talks about.',
    tutor: 'Have the student label every unit and write “__ units = __” before dividing.',
  },
  'forgot-adjust': {
    name: 'Divides before removing the extra',
    student: 'The bars are not equal yet. Take away the extra part first, then share what is left equally.',
    tutor: 'Practice “make the bars equal first”: cover the extra part, then divide.',
  },
  'stopped-early': {
    name: 'Stops one step early',
    student: 'That number is part of the way there. Read the question again: what does it ask for?',
    tutor: 'End every problem by re-reading the question and circling the quantity it asks for.',
  },
  'fraction-parts': {
    name: 'Uses the numerator as the number of parts',
    student: 'The bottom number of the fraction tells you how many equal units the whole bar has.',
    tutor: 'Use fraction strips and say “3 out of 8 equal parts” aloud while drawing.',
  },
  'fraction-complement': {
    name: 'Finds the other part instead',
    student: 'You found the other part of the bar. Check whether the question asks for the part used or the part left.',
    tutor: 'Have the student shade the part the question asks about before calculating.',
  },
  'fraction-wrong-whole': {
    name: 'Takes a fraction of the wrong whole',
    student: '“Of the remainder” means a fraction of what is left, not of the amount at the start.',
    tutor: 'Draw a new bracket around the remainder and re-split only that part of the bar.',
  },
  'percent-base': {
    name: 'Misreads what the percent refers to',
    student: 'The whole bar is 100%. Each equal unit is the same share of that 100%.',
    tutor: 'Link percent to 10 equal units of 10% each before moving to 5% or 25% units.',
  },
  'place-value': {
    name: 'Place-value slip',
    student: 'Check the size of your answer. Dividing by 100 makes a number much smaller than dividing by 10.',
    tutor: 'Ask for an estimate first: is 10% of 640 closer to 6, 64 or 640?',
  },
  'rate-unit': {
    name: 'Unsure what one unit of a rate means',
    student: 'One unit is the amount for 1 minute. Find that first, then multiply for more minutes.',
    tutor: 'Use a two-row table (minutes and amount) and the unitary method: find 1, then scale.',
  },
  'transfer-double': {
    name: 'Moves the whole difference in a transfer',
    student: 'Giving changes both bars: one gets shorter and the other gets longer. Only half the difference has to move.',
    tutor: 'Act it out with counters: move one at a time and compare the piles after each move.',
  },
  'before-after': {
    name: 'Gives the “after” amount instead of “before”',
    student: 'The question asks about the start, before anything was given away.',
    tutor: 'Label every model “Before” and “After” and underline which one the question asks about.',
  },
  'compare-direction': {
    name: 'Mixes up who has more',
    student: '“A has 245 more than B” means A has the longer bar.',
    tutor: 'Have the student restate the comparison sentence in their own words before drawing.',
  },
  arithmetic: {
    name: 'Calculation slip',
    student: 'Your method looks right. Check the calculation once more.',
    tutor: 'The method is sound. Check written arithmetic, regrouping and long division.',
  },
  other: {
    name: 'Other error',
    student: 'Look at the model and try again, or use a hint.',
    tutor: 'No known pattern. Ask the student to explain the model out loud.',
  },
};

export const TAGS = Object.keys(MISCONCEPTIONS);

// Decide which pattern a wrong number most likely comes from.
export function classifyNumber(value, answer, traps = []) {
  for (const t of traps) {
    if (Math.abs(value - t.value) < 1e-6) return { tag: t.tag, feedback: t.feedback };
  }
  const close = Math.abs(value - answer) <= Math.max(1, Math.abs(answer) * 0.15);
  const sameDigits =
    String(Math.round(Math.abs(value))).split('').sort().join('') ===
    String(Math.round(Math.abs(answer))).split('').sort().join('');
  if (close || sameDigits) return { tag: 'arithmetic' };
  return { tag: 'other' };
}
