// Builders that keep the eight templates short and consistent.
import { MISCONCEPTIONS } from './misconceptions.js';

// One bar segment. `len` is its drawn length in model units (bar models are
// not drawn to exact scale), `cls` picks its color role.
export function seg(id, len, cls = 'a', text = '', extra = {}) {
  return { id, len, cls, text, ...extra };
}

// `count` equal units with ids prefix1..prefixN.
export function units(prefix, count, len, cls, text = '', extra = {}, start = 1) {
  return Array.from({ length: count }, (_, i) => seg(`${prefix}${start + i}`, len, cls, text, extra));
}

// A multiple-choice step. Exactly one option has `correct: true`.
export function choice(rng, { prompt, options, hints = [], explain, work }) {
  const opts = rng.shuffle(options).map((o, i) => ({ id: `o${i}`, ...o }));
  return { type: 'choice', prompt, options: opts, hints, explain, work };
}

// A typed-number step. `traps` predict wrong answers and tag the error pattern.
export function num({ prompt, answer, prefix = '', suffix = '', traps = [], hints = [], explain, work }) {
  const clean = traps.filter(
    (t, i, all) =>
      Number.isFinite(t.value) &&
      Math.abs(t.value - answer) > 1e-6 &&
      all.findIndex((u) => Math.abs(u.value - t.value) < 1e-6) === i
  );
  for (const t of clean) {
    if (!MISCONCEPTIONS[t.tag] && t.tag !== 'none') throw new Error('Unknown tag ' + t.tag);
  }
  return { type: 'number', prompt, answer, prefix, suffix, traps: clean, hints, explain, work };
}

// Assemble cumulative scenes: drawing k is what the model shows after k steps are done.
export function scenes(fn) {
  return (k) => fn(k);
}
