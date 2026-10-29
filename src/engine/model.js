// Student model: Bayesian Knowledge Tracing per skill, plus error-pattern counts.
//
// BKT keeps one number per skill, P(L): the chance the student has learned it.
// After each first attempt at a step it applies Bayes' rule, then allows for
// learning from the step:
//   correct:   P(L|obs) = P(L)(1−S) / [P(L)(1−S) + (1−P(L))G]
//   incorrect: P(L|obs) = P(L)S     / [P(L)S     + (1−P(L))(1−G)]
//   then       P(L)'    = P(L|obs) + (1 − P(L|obs))·T
// S = slip (knows it, still errs), G = guess (doesn't know, still right),
// T = chance of learning from one step.
import { SKILLS, PREREQS, SKILL } from './skills.js';
import { MISCONCEPTIONS } from './misconceptions.js';

export const BKT = { init: 0.1, learn: 0.04, slip: 0.12, guessTyped: 0.3 };

export function bktUpdate(p, correct, guess) {
  const { slip, learn } = BKT;
  const post = correct
    ? (p * (1 - slip)) / (p * (1 - slip) + (1 - p) * guess)
    : (p * slip) / (p * slip + (1 - p) * (1 - guess));
  return post + (1 - post) * learn;
}

export const LEVELS = [
  { id: 'none', name: 'Not started' },
  { id: 'att', name: 'Attempted' },
  { id: 'fam', name: 'Familiar' },
  { id: 'pro', name: 'Proficient' },
  { id: 'mas', name: 'Mastered' },
];

export function levelOf(sk) {
  if (!sk || !sk.n) return 'none';
  if (sk.p >= 0.95 && sk.n >= 12) return 'mas';
  if (sk.p >= 0.8 && sk.n >= 4) return 'pro';
  if (sk.p >= 0.45) return 'fam';
  return 'att';
}

export function emptyStudent(name, id) {
  return {
    id,
    name,
    createdAt: Date.now(),
    skills: {},
    tags: {},
    history: [],
    worksheets: [],
  };
}

const HISTORY_CAP = 300;

// Record one step's first attempt. obs: {skillId, problemId, step, correct, hinted, guess, tag}
export function recordStep(student, obs) {
  const s = structuredClone(student);
  const cur = s.skills[obs.skillId] || { p: BKT.init, n: 0, c: 0 };
  const correct = obs.correct && !obs.hinted;
  cur.p = bktUpdate(cur.p, correct, obs.guess);
  cur.n += 1;
  cur.c += correct ? 1 : 0;
  cur.last = Date.now();
  s.skills[obs.skillId] = cur;
  if (obs.tag && obs.tag !== 'none') s.tags[obs.tag] = (s.tags[obs.tag] || 0) + 1;
  s.history.push({
    t: Date.now(),
    skill: obs.skillId,
    problem: obs.problemId,
    step: obs.step,
    ok: correct,
    hint: !!obs.hinted,
    tag: obs.tag && obs.tag !== 'none' ? obs.tag : undefined,
  });
  if (s.history.length > HISTORY_CAP) s.history = s.history.slice(-HISTORY_CAP);
  return s;
}

// A graded paper worksheet: score plus the error patterns the tutor noticed.
export function recordWorksheet(student, entry) {
  const s = structuredClone(student);
  s.worksheets.unshift({ ...entry, t: Date.now() });
  s.worksheets = s.worksheets.slice(0, 120);
  for (const tag of entry.tags || []) s.tags[tag] = (s.tags[tag] || 0) + 1;
  // Paper results also move mastery, capped so one sheet can't swamp the model.
  const right = Math.min(entry.correct, 8);
  const wrong = Math.min(entry.total - entry.correct, 8);
  for (const skillId of entry.skills || []) {
    if (!SKILL[skillId]) continue;
    const cur = s.skills[skillId] || { p: BKT.init, n: 0, c: 0 };
    for (let i = 0; i < right; i++) cur.p = bktUpdate(cur.p, true, 0.2);
    for (let i = 0; i < wrong; i++) cur.p = bktUpdate(cur.p, false, 0.2);
    cur.n += right + wrong;
    cur.c += right;
    cur.last = Date.now();
    s.skills[skillId] = cur;
  }
  return s;
}

// Error patterns, weighted toward recent work: each tag in the last 60 steps
// counts double, older totals and worksheet tags count once.
export function topPatterns(student, limit = 3) {
  const score = { ...student.tags };
  for (const h of student.history.slice(-60)) if (h.tag) score[h.tag] = (score[h.tag] || 0) + 1;
  return Object.entries(score)
    .filter(([tag, n]) => n > 0 && MISCONCEPTIONS[tag] && tag !== 'other')
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, n]) => ({ tag, n: student.tags[tag] || 0, ...MISCONCEPTIONS[tag] }));
}

export function patternsForSkill(student, skillId) {
  const counts = {};
  for (const h of student.history) if (h.skill === skillId && h.tag) counts[h.tag] = (counts[h.tag] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

// Pick what to practice next.
export function recommend(student) {
  const sk = (id) => student.skills[id];
  const p = (id) => (sk(id) ? sk(id).p : 0);
  const ready = (id) => PREREQS[id].every((q) => p(q) >= 0.8);
  const open = SKILLS.filter((s) => levelOf(sk(s.id)) !== 'mas');
  if (!open.length) return { skillId: null, reason: 'Every skill is mastered. Try a mixed review to keep it fresh.' };

  const started = open.filter((s) => sk(s.id) && ready(s.id)).sort((a, b) => p(a.id) - p(b.id));
  if (started.length && p(started[0].id) < 0.8) {
    const s = started[0];
    const pats = patternsForSkill(student, s.id);
    const why = pats.length
      ? `Most common slip here: ${MISCONCEPTIONS[pats[0][0]].name.toLowerCase()}.`
      : 'More practice will firm this up.';
    return { skillId: s.id, reason: `${s.name} is at ${Math.round(p(s.id) * 100)}% mastery. ${why}` };
  }
  const fresh = open.find((s) => !sk(s.id) && ready(s.id));
  if (fresh) {
    const after = PREREQS[fresh.id].map((q) => SKILL[q].name);
    return {
      skillId: fresh.id,
      reason: after.length ? `Ready for this: ${after.join(' and ')} ${after.length > 1 ? 'are' : 'is'} at least Proficient.` : 'A good starting point that needs no earlier skill.',
    };
  }
  const weakest = open.slice().sort((a, b) => p(a.id) - p(b.id))[0];
  return { skillId: weakest.id, reason: `${weakest.name} is the lowest skill that is not yet mastered.` };
}

export function courseSummary(student) {
  const counts = { none: 0, att: 0, fam: 0, pro: 0, mas: 0 };
  for (const s of SKILLS) counts[levelOf(student?.skills?.[s.id])] += 1;
  // Khan-style course score: points per level, out of 100 per skill.
  const pts = { none: 0, att: 0, fam: 50, pro: 80, mas: 100 };
  const score = Math.round(SKILLS.reduce((a, s) => a + pts[levelOf(student?.skills?.[s.id])], 0) / SKILLS.length);
  return { counts, score };
}
