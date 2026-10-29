import pw from './templates/partWhole.js';
import cmp from './templates/comparison.js';
import mul from './templates/multiples.js';
import frac from './templates/fractionOf.js';
import rem from './templates/remainder.js';
import pct from './templates/percentage.js';
import rate from './templates/rate.js';
import xfer from './templates/transfer.js';
import { makeRng, newSeed } from './util.js';

export const SKILLS = [pw, cmp, mul, frac, rem, pct, rate, xfer];
export const SKILL = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

export const UNITS = [
  { id: 'u1', name: 'Whole-number word problems' },
  { id: 'u2', name: 'Fractions in word problems' },
  { id: 'u3', name: 'Percentage and rate' },
  { id: 'u4', name: 'Heuristics' },
];

// A skill should wait until the skills it builds on are at least Proficient.
export const PREREQS = { pw: [], cmp: ['pw'], mul: ['pw'], frac: [], rem: ['frac'], pct: ['frac'], rate: [], xfer: ['mul'] };

// Build a playable problem. Same skill + seed (+ params) always gives the same problem.
export function makeProblem(skillId, seed = newSeed(), params = null) {
  const skill = SKILL[skillId];
  const rng = makeRng(seed);
  const p = params || skill.generate(rng);
  const built = skill.build(p, makeRng(seed ^ 0x9e3779b9));
  return { id: `${skillId}-${seed}`, skillId, seed, params: p, ...built };
}
