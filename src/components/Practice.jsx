import React, { useMemo, useRef, useState } from 'react';
import BarModel from './BarModel.jsx';
import useStepper from './useStepper.js';
import { StepControls, Verdict, StepButtons, Working } from './Exercise.jsx';
import { Icon, Rich, MasteryIcon } from './ui.jsx';
import { SKILL, makeProblem } from '../engine/skills.js';
import { MISCONCEPTIONS } from '../engine/misconceptions.js';
import { levelOf, LEVELS, recommend } from '../engine/model.js';
import { worksheetsForSkill } from '../data/catalog.js';

// A practice set: five problems, each solved one step at a time.
export default function Practice({ plan, student, onRecord, onExit, teacher }) {
  const problems = useMemo(() => plan.problems || plan.skills.map((id) => makeProblem(id)), [plan]);
  const startSkills = useRef(student ? structuredClone(student.skills) : {});
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState([]);
  const [allTags, setAllTags] = useState({});
  const [first, setFirst] = useState({ ok: 0, n: 0 });
  const [finished, setFinished] = useState(false);

  const problem = problems[idx];
  const skill = SKILL[problem.skillId];
  const st = useStepper(problem, onRecord);

  function nextProblem() {
    setResults((r) => [...r, st.helped ? 'help' : 'ok']);
    setAllTags((t) => { const o = { ...t }; for (const [k, v] of Object.entries(st.tags)) o[k] = (o[k] || 0) + v; return o; });
    setFirst((f) => ({ ok: f.ok + st.firstTry.ok, n: f.n + st.firstTry.n }));
    if (idx + 1 >= problems.length) { setFinished(true); return; }
    setIdx(idx + 1);
    st.resetProblem();
  }
  const onNext = () => (st.solved ? nextProblem() : st.nextStep());
  const nextLabel = st.solved ? (idx + 1 >= problems.length ? 'See results' : 'Next problem') : 'Next step';

  if (finished) {
    return <Results problems={problems} results={results} first={first} tags={allTags} startSkills={startSkills.current} student={student} onExit={onExit} teacher={teacher} />;
  }

  return (
    <div className="ex">
      <div className="wrap ex-head">
        <a className="back" href="#home" onClick={(e) => { e.preventDefault(); onExit(); }}><Icon name="back" size={18} /> Home</a>
        <h1>{plan.title || skill.name}</h1>
        <div className="dots" role="img" aria-label={`Problem ${idx + 1} of ${problems.length}`}>
          {problems.map((p, i) => <span key={p.id} className={`dot${i === idx ? ' cur' : ''}${results[i] === 'ok' ? ' ok' : ''}${results[i] === 'help' ? ' help' : ''}`} />)}
        </div>
      </div>

      <div className="wrap ex-body">
        <section className="ask" aria-label="Problem">
          <Rich as="p" className="problem-text" text={problem.text} />
          <div className="progress" aria-hidden="true">
            {problem.steps.map((_, i) => <span key={i} className={i < st.k ? 'done' : i === st.k ? 'cur' : ''} />)}
          </div>
          <span className="sr-only" aria-live="polite">Step {Math.min(st.k + (st.locked ? 0 : 1), st.n)} of {st.n}</span>
        </section>

        <section className="ask-col" aria-label="Current step">
          {st.solved && st.locked ? (
            <div className="done-note" role="status">
              <span className="ans">{problem.answerText}</span>
              <p>{st.helped ? 'You had help on this one. Try the next on your own.' : 'Every step right the first time.'}</p>
            </div>
          ) : (
            <StepControls st={st} onSubmit={() => (st.locked ? onNext() : st.check())} idPrefix="p" />
          )}
        </section>

        <section className="desk sheet" aria-label="Your exercise book page">
          <div className="sheet-head"><b>{skill.name}</b><span>{skill.heuristic}</span></div>
          <div className="canvas"><BarModel problem={problem} k={st.k} label={`Model for problem ${idx + 1}`} /></div>
          <Working problem={problem} k={st.k} />
        </section>
      </div>

      <footer className="check-bar">
        <div className="wrap check-in">
          {st.feedback ? <Verdict st={st} /> : <div className="verdict"><p>Answer the step, then check it.</p></div>}
          <StepButtons st={st} onNext={onNext} nextLabel={nextLabel} />
        </div>
      </footer>
    </div>
  );
}

function Results({ problems, results, first, tags, startSkills, student, onExit, teacher }) {
  const okCount = results.filter((r) => r === 'ok').length;
  const skillIds = [...new Set(problems.map((p) => p.skillId))];
  const pats = Object.entries(tags).sort((a, b) => b[1] - a[1]);
  const reco = student ? recommend(student) : null;
  const sheets = teacher && reco?.skillId ? worksheetsForSkill(teacher.catalog, reco.skillId) : [];
  const name = (lv) => LEVELS.find((l) => l.id === lv).name;
  return (
    <div className="wrap">
      <div className="results">
        <h1>Set finished</h1>
        <div className="figures">
          <div><b>{okCount} of {problems.length}</b><span>problems solved without help</span></div>
          <div><b>{first.n ? Math.round((first.ok / first.n) * 100) : 0}%</b><span>of steps right the first time</span></div>
          <div><b>{pats.length}</b><span>{pats.length === 1 ? 'mistake pattern' : 'mistake patterns'} spotted</span></div>
        </div>

        {student && !student.guest ? (
          <div className="block">
            <h2>Mastery</h2>
            {skillIds.map((id) => {
              const before = levelOf(startSkills[id]);
              const after = levelOf(student.skills[id]);
              return (
                <div className="meter" key={id}>
                  <MasteryIcon level={after} />
                  <div><b>{SKILL[id].name}</b><div className="sub">{before === after ? `Still ${name(after)}` : `${name(before)} to ${name(after)}`}</div></div>
                  <b>{Math.round((student.skills[id]?.p || 0) * 100)}%</b>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="ok-note">This set was practiced as a guest, so it was not saved. A teacher can sign in and pick a student to track mastery.</p>
        )}

        {pats.length ? (
          <div className="block">
            <h2>What to watch for</h2>
            {pats.slice(0, 3).map(([t, c]) => (
              <div className="pattern" key={t}>
                <b>{MISCONCEPTIONS[t].name}{c > 1 ? `, ${c} times` : ''}</b>
                <p>{MISCONCEPTIONS[t].student}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="next">
          {reco?.skillId ? (
            <>
              <h3>Next: {SKILL[reco.skillId].name}</h3>
              <p>{reco.reason}</p>
              {sheets.length ? (
                <div className="ws" aria-label="Matching worksheets">
                  {sheets.map((w) => teacher.links[w.name]
                    ? <a key={w.sn} className="tag blue" href={teacher.links[w.name]} target="_blank" rel="noreferrer">{w.name} <Icon name="external" size={14} /></a>
                    : <span key={w.sn} className="tag">{w.name}</span>)}
                </div>
              ) : null}
            </>
          ) : <h3>Keep going</h3>}
          <div className="row">
            {reco?.skillId ? <a className="btn btn-primary" href={`#practice-${reco.skillId}`}>Practice next skill</a> : null}
            <button className="btn btn-quiet" type="button" onClick={onExit}>Back home</button>
          </div>
        </div>
      </div>
    </div>
  );
}
