import { useCallback, useState } from 'react';
import { MISCONCEPTIONS, classifyNumber } from '../engine/misconceptions.js';
import { parseNumber, near, fmt } from '../engine/util.js';
import { BKT } from '../engine/model.js';

// The step-by-step solving logic shared by the practice screen and the
// exercise on the home page. `k` is the number of finished steps, which is
// also how much of the model is drawn.
export default function useStepper(problem, onRecord) {
  const [k, setK] = useState(0);
  const [sel, setSel] = useState('');
  const [status, setStatus] = useState('idle'); // idle | wrong | correct | revealed
  const [feedback, setFeedback] = useState(null);
  const [wrongPicks, setWrongPicks] = useState([]);
  const [hints, setHints] = useState(0);
  const [recorded, setRecorded] = useState(false);
  const [helped, setHelped] = useState(false);
  const [tags, setTags] = useState({});
  const [firstTry, setFirstTry] = useState({ ok: 0, n: 0 });

  const n = problem.steps.length;
  const solved = k >= n;
  const locked = status === 'correct' || status === 'revealed';
  const current = problem.steps[Math.min(k, n - 1)];
  const shown = locked ? problem.steps[k - 1] : solved ? null : current;

  const record = (correct, tag) => {
    if (recorded) return;
    setRecorded(true);
    const s = problem.steps[k];
    const ok = correct && hints === 0;
    setFirstTry((f) => ({ ok: f.ok + (ok ? 1 : 0), n: f.n + 1 }));
    if (!ok) setHelped(true);
    if (tag && tag !== 'none' && tag !== 'other') setTags((t) => ({ ...t, [tag]: (t[tag] || 0) + 1 }));
    onRecord?.({
      skillId: problem.skillId,
      problemId: problem.id,
      step: k,
      correct,
      hinted: hints > 0,
      guess: s.type === 'choice' ? 1 / s.options.length : BKT.guessTyped,
      tag: correct ? null : tag,
    });
  };

  const choose = (value) => {
    setSel(value);
    if (status === 'wrong') {
      setStatus('idle');
      setFeedback(null);
    }
  };

  const check = () => {
    const s = problem.steps[k];
    let ok;
    let tag;
    let fb;
    if (s.type === 'choice') {
      const opt = s.options.find((o) => o.id === sel);
      if (!opt) return;
      ok = !!opt.correct;
      tag = opt.tag;
      fb = opt.feedback;
      if (!ok) setWrongPicks((w) => [...w, opt.id]);
    } else {
      const v = parseNumber(sel);
      if (v == null) {
        setStatus('wrong');
        setFeedback({ title: 'Type a number', text: 'Digits only, like 970 or 12.5. Commas and $ are fine.' });
        return;
      }
      ok = near(v, s.answer);
      if (!ok) ({ tag, feedback: fb } = classifyNumber(v, s.answer, s.traps));
    }
    record(ok, tag);
    if (ok) {
      setStatus('correct');
      setFeedback({ title: 'Correct', text: s.explain });
      setK(k + 1);
    } else {
      setStatus('wrong');
      const known = tag && tag !== 'other' && tag !== 'none' && tag !== 'arithmetic' ? MISCONCEPTIONS[tag].name : null;
      setFeedback({ title: known || 'Not yet', text: fb || MISCONCEPTIONS[tag]?.student || MISCONCEPTIONS.other.student, tag });
    }
  };

  const reveal = () => {
    const s = problem.steps[k];
    record(false, null);
    setHelped(true);
    setSel(s.type === 'choice' ? s.options.find((o) => o.correct).id : fmt(s.answer).replace(/,/g, ''));
    setStatus('revealed');
    setFeedback({ title: 'Here is this step', text: s.explain });
    setK(k + 1);
  };

  // Show a step as a worked example (used once on the home page). Not recorded.
  const demo = () => {
    const s = problem.steps[k];
    setSel(s.type === 'choice' ? s.options.find((o) => o.correct).id : fmt(s.answer).replace(/,/g, ''));
    setStatus('correct');
    setFeedback({ title: 'The first step, done for you', text: s.explain });
    setK(k + 1);
  };

  const hint = () => {
    setHints((h) => Math.min(h + 1, current.hints.length));
    if (status === 'wrong') {
      setStatus('idle');
      setFeedback(null);
    }
  };

  const nextStep = useCallback(() => {
    setSel('');
    setStatus('idle');
    setFeedback(null);
    setWrongPicks([]);
    setHints(0);
    setRecorded(false);
  }, []);

  const resetProblem = useCallback(() => {
    setK(0);
    setHelped(false);
    setTags({});
    setFirstTry({ ok: 0, n: 0 });
    nextStep();
  }, [nextStep]);

  return {
    k, n, sel, status, feedback, wrongPicks, hints, recorded, helped, tags, firstTry,
    solved, locked, current, shown,
    choose, check, reveal, demo, hint, nextStep, resetProblem,
  };
}
