// Sample class for previewing the tutor dashboard. These are simulated
// learners run through the real problems and the real student model; they are
// never saved and are always labeled as samples in the interface.
import { SKILLS, makeProblem } from './engine/skills.js';
import { emptyStudent, recordStep, recordWorksheet } from './engine/model.js';
import { makeRng } from './engine/util.js';

const PROFILES = [
  {
    id: 'sample-a', name: 'Aarav (sample)',
    skill: { pw: 0.95, cmp: 0.9, mul: 0.88, frac: 0.7, rem: 0.35, pct: 0.6, rate: 0.85, xfer: 0.5 },
    habits: { 'fraction-wrong-whole': 5, 'fraction-complement': 3, 'transfer-double': 2 },
    sessions: 14,
  },
  {
    id: 'sample-b', name: 'Bella (sample)',
    skill: { pw: 0.85, cmp: 0.55, mul: 0.6, frac: 0.75, rem: 0.4, pct: 0.5, rate: 0.6, xfer: 0.3 },
    habits: { 'forgot-adjust': 6, 'stopped-early': 4, 'unit-count': 2 },
    sessions: 10,
  },
  {
    id: 'sample-c', name: 'Chen (sample)',
    skill: { pw: 0.97, cmp: 0.95, mul: 0.95, frac: 0.92, rem: 0.85, pct: 0.55, rate: 0.9, xfer: 0.45 },
    habits: { 'transfer-double': 6, 'place-value': 4, 'before-after': 2 },
    sessions: 16,
  },
  {
    id: 'sample-d', name: 'Dina (sample)',
    skill: { pw: 0.6, cmp: 0.35, mul: 0.4, frac: 0.45, rem: 0.2, pct: 0.3, rate: 0.5, xfer: 0.15 },
    habits: { 'wrong-whole': 4, 'unit-count': 5, arithmetic: 4, 'wrong-operation': 3 },
    sessions: 8,
  },
];

function pickTag(rng, step, habits) {
  const tags = step.type === 'choice'
    ? step.options.filter((o) => !o.correct).map((o) => o.tag)
    : [...step.traps.map((t) => t.tag).filter((t) => t !== 'none'), 'arithmetic'];
  const weighted = tags.map((t) => [t, (habits[t] || 0) + (t === 'arithmetic' ? 0.4 : 1)]);
  let r = rng.next() * weighted.reduce((a, [, w]) => a + w, 0);
  for (const [t, w] of weighted) if ((r -= w) <= 0) return t;
  return weighted[0][0];
}

export function buildSampleClass() {
  const rng = makeRng(20261028);
  const day = 24 * 3600 * 1000;
  return PROFILES.map((prof, pi) => {
    let s = emptyStudent(prof.name, prof.id);
    s.sample = true;
    const order = SKILLS.map((k) => k.id);
    for (let sess = 0; sess < prof.sessions; sess++) {
      const skillId = order[Math.min(order.length - 1, Math.floor((sess / prof.sessions) * order.length + rng.next() * 2))];
      for (let q = 0; q < 2; q++) {
        const p = makeProblem(skillId, rng.int(1, 1e9));
        p.steps.forEach((st, i) => {
          const learned = Math.min(0.98, prof.skill[skillId] + sess * 0.01);
          const ok = rng.next() < learned;
          const tag = ok ? null : pickTag(rng, st, prof.habits);
          s = recordStep(s, {
            skillId, problemId: p.id, step: i, correct: ok, hinted: false,
            guess: st.type === 'choice' ? 1 / st.options.length : 0.3, tag,
          });
        });
      }
    }
    // Spread the simulated history over the last few weeks.
    const n = s.history.length;
    s.history = s.history.map((h, i) => ({ ...h, t: Date.now() - (n - i) * (21 * day / n) - pi * 3600e3 }));
    s = recordWorksheet(s, {
      sn: 0, name: 'Sample word-problem sheet', topic: 'Word problems', skills: ['pw', 'cmp', 'mul'],
      correct: Math.round(10 * prof.skill.cmp), total: 10,
      tags: Object.keys(prof.habits).slice(0, 1),
      note: 'Sample entry',
    });
    s.worksheets[0].t = Date.now() - (2 + pi) * day;
    return s;
  });
}
