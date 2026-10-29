import React, { useEffect, useRef } from 'react';
import { Icon, Rich, plain, Tick, Ring, Cross } from './ui.jsx';

const LETTERS = 'ABCDE';

// The question for the current step and the controls to answer it.
export function StepControls({ st, onSubmit, idPrefix = 'q' }) {
  const { shown, sel, status, locked, wrongPicks, hints, current, choose } = st;
  const inputRef = useRef(null);
  useEffect(() => {
    if (!locked && shown?.type === 'number' && idPrefix !== 'hero') {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [shown, locked, idPrefix]);
  if (!shown) return null;

  return (
    <div className="ask-step" style={{ display: 'grid', gap: 18 }}>
      <Rich as="p" className="prompt" text={shown.prompt} />
      {shown.type === 'choice' ? (
        <div className="options" role="radiogroup" aria-label={plain(shown.prompt)}
          onKeyDown={(e) => {
            if (locked || !['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(e.key)) return;
            e.preventDefault();
            const ids = shown.options.map((o) => o.id);
            const cur = Math.max(0, ids.indexOf(sel));
            const nxt = ids[(cur + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length];
            choose(nxt);
            e.currentTarget.querySelector(`[data-id="${nxt}"]`)?.focus();
          }}>
          {shown.options.map((o, i) => {
            const picked = sel === o.id;
            const wrong = wrongPicks.includes(o.id) && picked && status === 'wrong';
            const right = locked && o.correct;
            return (
              <button key={o.id} data-id={o.id} type="button" role="radio" aria-checked={picked}
                tabIndex={picked || (!sel && i === 0) ? 0 : -1}
                className={`option${right ? ' is-right' : ''}`} disabled={locked} onClick={() => choose(o.id)}>
                <span className="letter" style={{ position: 'relative' }}>
                  {LETTERS[i]}
                  {wrong ? <Cross size={30} style={{ left: -1, top: -1 }} /> : null}
                </span>
                <Rich text={o.label} />
                {right && status === 'correct' ? (
                  <span style={{ position: 'absolute', right: 14, top: '50%', marginTop: -20, width: 44, height: 40 }}><Tick /></span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        <form className="entry" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
          {shown.prefix ? <span className="affix">{shown.prefix}</span> : null}
          <span className="box">
            <label className="sr-only" htmlFor={`${idPrefix}-answer`}>Your answer</label>
            <input id={`${idPrefix}-answer`} ref={inputRef} inputMode="decimal" autoComplete="off" spellCheck={false}
              value={sel} disabled={locked} onChange={(e) => choose(e.target.value)} />
            {status === 'wrong' ? <Ring /> : null}
          </span>
          {shown.suffix ? <span className="affix">{shown.suffix}</span> : null}
          {status === 'correct' ? <span style={{ position: 'relative', width: 44, height: 40 }}><Tick /></span> : null}
        </form>
      )}
      {!locked && hints > 0 ? (
        <div className="hints" aria-live="polite">
          {current.hints.slice(0, hints).map((h, i) => (
            <p className="hint" key={i}><b>Hint</b><Rich text={h} /></p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// What the marker says about the last answer.
export function Verdict({ st }) {
  const { feedback, status } = st;
  if (!feedback) return null;
  return (
    <div className="verdict" role="status" aria-live="polite">
      <div>
        {status === 'wrong' ? <strong className="red">{feedback.title}</strong> : <strong>{feedback.title}</strong>}
        <Rich as="p" text={feedback.text} />
      </div>
    </div>
  );
}

// Hint / Show me / Check / Next, in that order of weight.
export function StepButtons({ st, onNext, nextLabel, compact }) {
  const { locked, status, sel, hints, current, solved, recorded, hint, reveal, check } = st;
  const canCheck = !locked && sel !== '';
  return (
    <div className="acts">
      {!locked && !solved ? (
        <button className="btn btn-text btn-sm" type="button" disabled={hints >= current.hints.length} onClick={hint}>
          <Icon name="bulb" size={18} /> {hints === 0 ? 'Hint' : hints < current.hints.length ? 'Another hint' : 'No more hints'}
        </button>
      ) : null}
      {recorded && !locked ? <button className="btn btn-quiet btn-sm" type="button" onClick={reveal}>Show me</button> : null}
      {locked ? (
        <button className={`btn btn-primary${compact ? ' btn-sm' : ''}`} type="button" onClick={onNext} autoFocus={!compact}>
          {nextLabel}
        </button>
      ) : (
        <button className={`btn btn-primary${compact ? ' btn-sm' : ''}`} type="button" disabled={!canCheck} onClick={check}>
          Check
        </button>
      )}
      {status === 'wrong' ? null : null}
    </div>
  );
}

export function Working({ problem, k, quiet = false }) {
  const lines = problem.steps.slice(0, k).map((s) => s.work);
  return (
    <div className="working" aria-label="Working">
      {lines.length ? lines.map((w, i) => <span className="line" key={`${problem.id}-${i}`}>{w}</span>) : quiet ? null : <span className="empty">Working appears here as each step is finished.</span>}
    </div>
  );
}
