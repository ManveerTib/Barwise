import React, { useEffect, useMemo, useRef, useState } from 'react';
import BarModel from './BarModel.jsx';
import useStepper from './useStepper.js';
import { StepControls, Verdict, StepButtons, Working } from './Exercise.jsx';
import { Icon, Rich, MasteryIcon, Ring, useReveal } from './ui.jsx';
import { SKILLS, makeProblem } from '../engine/skills.js';
import { MISCONCEPTIONS } from '../engine/misconceptions.js';
import { levelOf, LEVELS, recommend } from '../engine/model.js';
import { buildSampleClass } from '../sample.js';
import { fmt } from '../engine/util.js';

const HERO_PARAMS = { total: 1215, diff: 245, A: 'Ali', B: 'Ben', item: 'stamps', ask: 'small' };

// The one live thing on the page: a real problem, solved right here.
function HeroExercise({ onRecord }) {
  const [problem, setProblem] = useState(() => makeProblem('cmp', 1215, HERO_PARAMS));
  const st = useStepper(problem, onRecord);
  const next = () => (st.solved ? null : st.nextStep());
  // On arrival the first step is worked as an example, so the page opens on a drawing.
  const demoed = useRef(false);
  useEffect(() => {
    if (demoed.current) return;
    demoed.current = true;
    const t = setTimeout(() => st.demo(), 700);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const another = () => {
    setProblem(makeProblem(['cmp', 'mul', 'frac', 'xfer'][Math.floor(Math.random() * 4)]));
    st.resetProblem();
  };
  return (
    <div className="sheet" aria-label="Try a problem">
      <div className="sheet-pad" style={{ paddingBottom: 6 }}>
        <Rich as="p" className="problem" text={problem.text} />
      </div>
      <div style={{ padding: '0 12px' }}><BarModel problem={problem} k={st.k} label="Model for the sample problem" maxWidth={720} /></div>
      <Working problem={problem} k={st.k} quiet />
      <div style={{ padding: '18px 24px 24px', background: 'var(--sheet)', display: 'grid', gap: 16 }}>
        {st.solved && st.locked ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <p className="hand" style={{ fontSize: 26, fontWeight: 600, color: 'var(--blue)' }}>{problem.answerText}</p>
            <Verdict st={st} />
            <div className="row">
              <button className="btn btn-quiet btn-sm" type="button" onClick={another}>Try another</button>
              <a className="btn btn-primary btn-sm" href={`#practice-${problem.skillId}`}>Practice five more</a>
            </div>
          </div>
        ) : (
          <>
            <StepControls st={st} onSubmit={() => (st.locked ? next() : st.check())} idPrefix="hero" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: '1 1 220px', minWidth: 0 }}><Verdict st={st} /></div>
              <StepButtons st={st} onNext={next} nextLabel="Next step" compact />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// A finished model that draws itself, step by step, when it scrolls into view.
function SelfDrawing({ problem, autoplay = false, hold = 2600, onStep }) {
  const ref = useRef(null);
  const n = problem.steps.length;
  // Complete at rest. A drawing that starts below the fold is cleared while
  // still out of sight, then draws itself once it scrolls into view.
  const [k, setK] = useState(n);
  const [visible, setVisible] = useState(false);
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    if (reduce) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    let first = true;
    const io = new IntersectionObserver(([e]) => {
      if (first) { first = false; if (!e.isIntersecting) setK(0); else if (!autoplay) { io.disconnect(); return; } }
      setVisible(e.isIntersecting);
    }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, [n, reduce, autoplay]);
  useEffect(() => {
    if (reduce || !visible) return;
    if (k < n) { const t = setTimeout(() => setK(k + 1), k === 0 ? 250 : autoplay ? 1500 : 420); return () => clearTimeout(t); }
    if (autoplay) { const t = setTimeout(() => setK(0), hold); return () => clearTimeout(t); }
  }, [k, n, visible, autoplay, hold, reduce]);
  useEffect(() => { onStep?.(k); }, [k, onStep]);
  return <div ref={ref}><BarModel problem={problem} k={k} shell label={`Finished model: ${problem.answerText}`} maxWidth={760} /></div>;
}

// Real examples of the error patterns, taken from the problem engine itself.
function useExamples() {
  return useMemo(() => {
    const find = (skillId, seed, params, tag, type) => {
      const p = makeProblem(skillId, seed, params);
      for (const s of p.steps) {
        if (type && s.type !== type) continue;
        if (s.type === 'number') {
          const t = s.traps.find((x) => x.tag === tag);
          if (t) return { p, s, wrong: (s.prefix || '') + fmt(t.value) };
        } else {
          const o = s.options.find((x) => x.tag === tag);
          if (o) return { p, s, wrong: o.label };
        }
      }
      return null;
    };
    return [
      { ...find('cmp', 1215, HERO_PARAMS, 'forgot-adjust'), tag: 'forgot-adjust' },
      { ...find('frac', 360, { n: 3, d: 8, whole: 360, kind: 'money', name: 'Sam', thing: 0, ask: 'part' }, 'fraction-parts', 'number'), tag: 'fraction-parts' },
      { ...find('xfer', 40, { k: 3, g: 40, A: 'Ravi', B: 'Tom', item: 'cards', ask: 'big' }, 'transfer-double', 'choice'), tag: 'transfer-double' },
    ].filter((e) => e.p);
  }, []);
}

// Bento order and widths (out of 12): wide cells for the models with the most to show.
const BENTO = [['cmp', 7], ['pw', 5], ['frac', 5], ['rem', 7], ['xfer', 7], ['mul', 5], ['rate', 5], ['pct', 7]];

const SHORT = { pw: 'Part-whole', cmp: 'Compare', mul: 'Multiples', frac: 'Fraction', rem: 'Remainder', pct: 'Percent', rate: 'Rate', xfer: 'Transfer' };

export default function Home({ student, onRecord, teacherHref }) {
  useReveal();
  const examples = useExamples();
  const gallery = useMemo(() => {
    const fixed = {
      pw: { start: 2400, a: 845, b: 1030, ctx: 0 },
      cmp: HERO_PARAMS,
      mul: { k: 3, u: 120, mode: 'total', A: 'Mei', B: 'Lin', item: 'beads', ask: 'big' },
      frac: { n: 3, d: 8, whole: 360, kind: 'money', name: 'Sam', thing: 0, ask: 'part' },
      rem: { combo: 0, left: 45, name: 'Jia', buy: 0 },
      pct: { p: 35, base: 640, ctx: 0, ask: 'part' },
      rate: { t1: 4, r: 39, t2: 9, ctx: 0 },
      xfer: { k: 3, g: 40, A: 'Ravi', B: 'Tom', item: 'cards', ask: 'big' },
    };
    return Object.fromEntries(SKILLS.map((s) => [s.id, makeProblem(s.id, 7, fixed[s.id])]));
  }, []);
  const loop = useMemo(() => makeProblem('rem', 45, { combo: 0, left: 45, name: 'Jia', buy: 0 }), []);
  const [loopK, setLoopK] = useState(0);
  const sample = useMemo(() => buildSampleClass(), []);
  const reco = recommend(student || { skills: {}, history: [], tags: {} });

  return (
    <>
      <section className="wrap hero" aria-labelledby="hero-h">
        <div className="hero-copy">
          <h1 id="hero-h"><span className="ln">Bar models,</span> <span className="ln">one step at a time</span></h1>
          <p className="lede">Built for SAM Singapore Math tutoring: Primary 5 word problems where each right answer adds to the model.</p>
          <div className="act">
            <a className="btn btn-primary" href={`#practice-${reco.skillId || 'pw'}`}>Start practice</a>
          </div>
        </div>
        <div className="hero-sheet"><HeroExercise onRecord={onRecord} /></div>
      </section>

      <section className="wrap sec" aria-labelledby="models-h">
        <h2 id="models-h" className="rise">Eight models for Primary 5 word problems</h2>
        <p className="lead rise" style={{ '--d': '80ms' }}>Each heuristic has its own way of drawing the story. Practice one, or watch it drawn with numbers from any worksheet.</p>
        <div className="bento">
          {BENTO.map(([id, span], i) => {
            const s = SKILLS.find((x) => x.id === id);
            const sk = student?.skills?.[id];
            return (
              <article className={`cell span-${span} rise`} key={id} style={{ '--d': `${(i % 2) * 90}ms` }} aria-labelledby={`cell-${id}`}>
                <div className="cell-pic sheet"><SelfDrawing problem={gallery[id]} /></div>
                <div className="cell-text">
                  <div>
                    <h3 id={`cell-${id}`}>{s.name}</h3>
                    <p>{s.heuristic}</p>
                    {student ? <span className="lvl"><MasteryIcon skill={sk} /> {student.name}: {LEVELS.find((l) => l.id === levelOf(sk)).name}</span> : null}
                  </div>
                  <div className="cell-act">
                    <a className="btn btn-primary btn-sm" href={`#practice-${id}`}>Practice</a>
                    <a className="btn btn-text btn-sm" href={`#builder-${id}`}>Watch it drawn</a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="wrap sec" aria-labelledby="reasons-h">
        <div className="reasons">
          <div className="say">
            <h2 id="reasons-h" className="rise">Every wrong answer has a reason</h2>
            <p className="statement rise" style={{ '--d': '80ms' }}>A wrong answer is usually the right answer to a different question. Barwise works out which one, names it, and says what to look at.</p>
          </div>
          <div className="marked sheet margin rise" style={{ '--d': '120ms' }} data-ui aria-label="Three marked answers">
            {examples.map((e) => (
              <div className="mark-entry" key={e.tag}>
                <Rich as="p" className="q" text={`${e.p.text.split('. ').slice(0, 2).join('. ')}. ${e.s.prompt}`} />
                <div className="ans-line">
                  <span className="written">{e.wrong}<Ring /></span>
                  <span className="note">{MISCONCEPTIONS[e.tag].name}</span>
                </div>
                <p className="tip">{MISCONCEPTIONS[e.tag].student}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="field" aria-labelledby="field-h">
        <div className="wrap field-in">
          <div className="field-copy">
            <h2 id="field-h" className="rise">Watch any problem draw itself</h2>
            <p className="rise" style={{ '--d': '80ms' }}>Type the numbers from a worksheet problem into the model builder and play its model one step at a time, at the table with a student.</p>
            <a className="btn rise" style={{ '--d': '160ms' }} href="#builder-rem">Open model builder</a>
          </div>
          <div className="field-pic rise" style={{ '--d': '120ms' }}>
            <div className="sheet" style={{ color: 'var(--ink)' }}>
              <div className="sheet-pad" style={{ paddingBottom: 4 }}><Rich as="p" className="problem" text={loop.text} /></div>
              <div style={{ padding: '0 12px' }}><SelfDrawing problem={loop} autoplay onStep={setLoopK} /></div>
              <Working problem={loop} k={loopK} quiet />
            </div>
          </div>
        </div>
      </section>

      <section className="wrap sec" aria-labelledby="tutors-h">
        <div className="tutors">
          <div className="frag panel rise" data-ui aria-label="Sample class, mastery by skill">
            <div className="scroll-x">
              <table className="heat">
                <caption className="sr-only">Sample class mastery</caption>
                <thead><tr><th>Sample class</th>{SKILLS.map((s) => <th key={s.id} style={{ textAlign: 'center' }}>{SHORT[s.id]}</th>)}</tr></thead>
                <tbody>
                  {sample.map((s) => (
                    <tr key={s.id}>
                      <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{s.name.replace(' (sample)', '')}</td>
                      {SKILLS.map((k) => <td className="cell" key={k.id}><div className="cb"><MasteryIcon skill={s.skills[k.id]} /><span>{s.skills[k.id] ? Math.round(s.skills[k.id].p * 100) : '-'}</span></div></td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="say">
            <h2 id="tutors-h" className="rise">See where each student stands</h2>
            <p className="rise" style={{ '--d': '80ms' }}>Mastery for every skill, the mistakes each student repeats, and the worksheet to assign next. Student records and worksheet links open only with the teacher passcode.</p>
            <a className="btn btn-quiet rise" style={{ '--d': '160ms', justifySelf: 'start' }} href={teacherHref}><Icon name="lock" size={18} /> Teacher sign-in</a>
          </div>
        </div>
      </section>
    </>
  );
}

export function Footer({ teacherHref }) {
  return (
    <footer className="foot">
      <div className="wrap">
        <p className="big" aria-hidden="true">Barwise</p>
        <div className="foot-row">
          <nav aria-label="Footer">
            <a href="#home">Practice</a>
            <a href="#builder-cmp">Model builder</a>
            <a href="#about">How it works</a>
            <a href={teacherHref}>Teacher sign-in</a>
          </nav>
          <p>Built for SAM Singapore Math tutoring. An independent practice tool, not made or endorsed by SAM. Problems are original, with new numbers every time.</p>
        </div>
      </div>
    </footer>
  );
}
