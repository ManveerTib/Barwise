// Checks every template across many random seeds:
//  - each step has one correct option or a finite numeric answer
//  - no trap equals the answer, numeric answers are clean (no long decimals)
//  - the final step's answer equals the problem's answer
//  - every scene renders references (braces point at real segments and rows)
import { SKILLS, makeProblem } from '../src/engine/skills.js';
import { MISCONCEPTIONS } from '../src/engine/misconceptions.js';

let problems = 0;
const fails = [];
for (const skill of SKILLS) {
  for (let seed = 1; seed <= 800; seed++) {
    let p;
    try {
      p = makeProblem(skill.id, seed * 7919);
    } catch (e) {
      fails.push(`${skill.id} seed ${seed}: build threw ${e.message}`);
      continue;
    }
    problems++;
    const err = skill.validate(p.params);
    if (err) fails.push(`${skill.id} seed ${seed}: generated params fail validation: ${err}`);
    p.steps.forEach((st, i) => {
      if (st.type === 'choice') {
        const ok = st.options.filter((o) => o.correct);
        if (ok.length !== 1) fails.push(`${p.id} step ${i}: ${ok.length} correct options`);
        if (st.options.length < 2) fails.push(`${p.id} step ${i}: fewer than 2 options`);
        const labels = new Set(st.options.map((o) => o.label));
        if (labels.size !== st.options.length) fails.push(`${p.id} step ${i}: duplicate option labels`);
        for (const o of st.options) if (!o.correct && !MISCONCEPTIONS[o.tag]) fails.push(`${p.id} step ${i}: option without tag`);
      } else {
        if (!Number.isFinite(st.answer)) fails.push(`${p.id} step ${i}: answer not finite`);
        if (Math.abs(st.answer * 100 - Math.round(st.answer * 100)) > 1e-6) fails.push(`${p.id} step ${i}: answer ${st.answer} has long decimals`);
        if (st.answer <= 0) fails.push(`${p.id} step ${i}: answer ${st.answer} not positive`);
        for (const t of st.traps) if (Math.abs(t.value - st.answer) < 1e-6) fails.push(`${p.id} step ${i}: trap equals answer`);
      }
      if (!st.hints.length) fails.push(`${p.id} step ${i}: no hints`);
    });
    const last = p.steps[p.steps.length - 1];
    if (last.type !== 'number' || Math.abs(last.answer - p.answer) > 1e-6) fails.push(`${p.id}: final step answer ${last.answer} != ${p.answer}`);
    for (let k = 0; k <= p.steps.length; k++) {
      const sc = p.scene(k);
      const segIds = new Map();
      for (const r of sc.rows) for (const g of r.segs) {
        if (segIds.has(g.id)) fails.push(`${p.id} scene ${k}: duplicate segment id ${g.id}`);
        segIds.set(g.id, r.id);
        if (!(g.len > 0)) fails.push(`${p.id} scene ${k}: segment ${g.id} has no length`);
      }
      const rowIds = new Set(sc.rows.map((r) => r.id));
      for (const b of sc.braces) {
        if (b.type === 'right') {
          for (const r of b.rows) if (!rowIds.has(r)) fails.push(`${p.id} scene ${k}: brace ${b.id} missing row ${r}`);
        } else if (b.type === 'end') {
          if (!rowIds.has(b.row)) fails.push(`${p.id} scene ${k}: end label missing row`);
        } else {
          if (segIds.get(b.from) !== b.row || segIds.get(b.to) !== b.row) fails.push(`${p.id} scene ${k}: brace ${b.id} ${b.from}..${b.to} not in row ${b.row}`);
        }
      }
      if (k > 0 && sc.rows.length === 0) fails.push(`${p.id} scene ${k}: empty model after a step`);
    }
  }
}
console.log(`${problems} problems checked across ${SKILLS.length} skills`);
if (fails.length) {
  console.log(`${fails.length} problems found:`);
  console.log([...new Set(fails)].slice(0, 40).join('\n'));
  process.exit(1);
}
console.log('All checks passed.');
