import React, { useEffect, useMemo, useState } from 'react';
import BarModel from './BarModel.jsx';
import { Working } from './Exercise.jsx';
import { Icon, Rich, MasteryIcon } from './ui.jsx';
import { SKILLS, SKILL, makeProblem } from '../engine/skills.js';
import { makeRng, newSeed, fmt } from '../engine/util.js';

const ASK = {
  cmp: [['small', 'The smaller amount'], ['big', 'The larger amount']],
  mul: [['big', 'The larger amount'], ['small', 'The smaller amount']],
  frac: [['part', 'The fraction part'], ['rest', 'The other part']],
  pct: [['part', 'The percent part'], ['rest', 'The other part']],
  xfer: [['big', 'The giver at first'], ['small', 'The receiver at first'], ['total', 'The total']],
};
const MODE = { mul: [['total', 'The total'], ['diff', 'The difference']] };

const answerOf = (step) => (step.type === 'choice'
  ? step.options.find((o) => o.correct).label
  : `${step.prefix || ''}${fmt(step.answer)}${step.suffix ? ' ' + step.suffix : ''}`);

// Type the numbers from any worksheet problem and play its model.
export default function Builder({ skillId, onPractice, student }) {
  const skill = SKILL[skillId] || SKILLS[0];
  const [seed, setSeed] = useState(newSeed);
  const [params, setParams] = useState(() => skill.generate(makeRng(seed)));
  const [draft, setDraft] = useState({});
  const [k, setK] = useState(99);
  const [playing, setPlaying] = useState(false);

  const merged = useMemo(() => {
    const out = { ...params };
    for (const f of skill.fields) {
      if (draft[f.key] === undefined) continue;
      const raw = String(draft[f.key]).replace(/[,\s$]/g, '');
      out[f.key] = f.type === 'combo' ? Number(raw) : raw === '' ? NaN : Number(raw);
    }
    for (const key of ['ask', 'mode']) if (draft[key] !== undefined) out[key] = draft[key];
    return out;
  }, [params, draft, skill]);

  const error = useMemo(() => {
    for (const f of skill.fields) {
      if (f.type === 'combo') continue;
      const v = merged[f.key];
      if (!Number.isInteger(v)) return `${f.label}: enter a whole number.`;
      if (v < f.min || v > f.max) return `${f.label}: use a number from ${fmt(f.min)} to ${fmt(f.max)}.`;
    }
    return skill.validate(merged);
  }, [merged, skill]);

  const [problem, setProblem] = useState(() => makeProblem(skill.id, seed, params));
  useEffect(() => {
    if (!error) { const p = makeProblem(skill.id, seed, merged); setProblem(p); setK(p.steps.length); }
  }, [merged, error, seed, skill]);

  const n = problem.steps.length;
  useEffect(() => {
    if (!playing) return;
    if (k >= n) { setPlaying(false); return; }
    const t = setTimeout(() => setK((x) => Math.min(n, x + 1)), k === 0 ? 400 : 1700);
    return () => clearTimeout(t);
  }, [playing, k, n]);

  const fresh = () => { const s = newSeed(); setSeed(s); setParams(skill.generate(makeRng(s))); setDraft({}); };
  const value = (f) => (draft[f.key] !== undefined ? draft[f.key] : String(params[f.key] ?? ''));

  return (
    <div className="wrap builder">
      <aside className="side">
        <div>
          <h1>Model builder</h1>
          <p style={{ marginTop: 10, color: 'var(--ink-2)' }}>Pick the kind of problem, type its numbers, and play the model.</p>
        </div>
        <div className="kinds" role="group" aria-label="Kind of problem">
          {SKILLS.map((s) => (
            <button key={s.id} type="button" aria-pressed={s.id === skill.id} onClick={() => { window.location.hash = `builder-${s.id}`; }}>
              <MasteryIcon small skill={student?.skills?.[s.id]} /> {s.name}
            </button>
          ))}
        </div>
        <form className="form" onSubmit={(e) => e.preventDefault()}>
          {skill.fields.map((f) => (
            <div className="fld" key={f.key}>
              <label htmlFor={`f-${f.key}`}>{f.label}</label>
              {f.type === 'combo' ? (
                <select id={`f-${f.key}`} className="input" value={value(f)} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}>
                  {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input id={`f-${f.key}`} className="input" inputMode="numeric" autoComplete="off" value={value(f)}
                  aria-describedby={error ? 'builder-err' : undefined}
                  onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
              )}
            </div>
          ))}
          {MODE[skill.id] ? (
            <div className="fld">
              <label htmlFor="f-mode">The story gives</label>
              <select id="f-mode" className="input" value={merged.mode} onChange={(e) => setDraft({ ...draft, mode: e.target.value })}>
                {MODE[skill.id].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          ) : null}
          {ASK[skill.id] ? (
            <div className="fld">
              <label htmlFor="f-ask">The question asks for</label>
              <select id="f-ask" className="input" value={merged.ask} onChange={(e) => setDraft({ ...draft, ask: e.target.value })}>
                {ASK[skill.id].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          ) : null}
          {error ? <p className="err" id="builder-err" role="alert">{error}</p> : null}
          <div className="row">
            <button className="btn btn-quiet btn-sm" type="button" onClick={fresh}><Icon name="restart" size={18} /> New numbers</button>
            <button className="btn btn-primary btn-sm" type="button" disabled={!!error} onClick={() => onPractice(problem)}>Practice this problem</button>
          </div>
        </form>
      </aside>

      <div className="stage">
        <div className="sheet">
          <div className="sheet-pad"><Rich as="p" className="problem" text={problem.text} /></div>
          <div style={{ padding: '0 12px' }}><BarModel problem={problem} k={k} label="Model builder drawing" /></div>
          <Working problem={problem} k={k} />
          <div className="player">
            <button className="btn btn-quiet btn-sm btn-icon" type="button" aria-label="Start over" onClick={() => { setK(0); setPlaying(false); }}><Icon name="restart" size={18} /></button>
            <button className="btn btn-quiet btn-sm btn-icon" type="button" aria-label="Previous step" disabled={k === 0} onClick={() => { setK(k - 1); setPlaying(false); }}><Icon name="back" size={18} /></button>
            <button className="btn btn-primary btn-sm" type="button" onClick={() => { if (k >= n) setK(0); setPlaying(!playing); }}>
              <Icon name={playing ? 'pause' : 'play'} size={16} /> {playing ? 'Pause' : k >= n ? 'Replay' : 'Play'}
            </button>
            <button className="btn btn-quiet btn-sm btn-icon" type="button" aria-label="Next step" disabled={k >= n} onClick={() => { setK(k + 1); setPlaying(false); }}><Icon name="next" size={18} /></button>
            <span className="count">{Math.min(k, n)} of {n} steps drawn</span>
          </div>
        </div>
        <ol className="steps-list" aria-label="Steps">
          {problem.steps.map((s, i) => (
            <li key={i} className={i < k ? 'done' : i === k ? 'cur' : ''}>
              <span className="tick">{i < k ? <Icon name="check" size={18} /> : null}</span>
              <div>
                <Rich text={s.prompt} />
                {i < k ? <span className="a">{answerOf(s)}</span> : null}
              </div>
            </li>
          ))}
          <li className={k >= n ? 'done' : ''}>
            <span className="tick">{k >= n ? <Icon name="check" size={18} /> : null}</span>
            <div>{k >= n ? <b>{problem.answerText}</b> : 'The answer appears after the last step.'}</div>
          </li>
        </ol>
      </div>
    </div>
  );
}
