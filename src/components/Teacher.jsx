import React, { useMemo, useRef, useState } from 'react';
import { SKILLS, SKILL } from '../engine/skills.js';
import { MISCONCEPTIONS, TAGS } from '../engine/misconceptions.js';
import { levelOf, LEVELS, recommend, topPatterns, courseSummary, recordWorksheet, emptyStudent } from '../engine/model.js';
import { buildCatalog, parseCatalogText, worksheetsForSkill } from '../data/catalog.js';
import { createVault, openVault } from '../store/vault.js';
import { Icon, MasteryIcon, Avatar, timeAgo } from './ui.jsx';

const SHORT = { pw: 'Part-whole', cmp: 'Compare', mul: 'Multiples', frac: 'Fraction', rem: 'Remainder', pct: 'Percent', rate: 'Rate', xfer: 'Transfer' };
const FILL = { mas: 'var(--m-mas)', pro: 'var(--m-pro)', fam: 'var(--m-att)', att: 'var(--m-att)', none: 'var(--m-none)' };
const lastActive = (s) => Math.max(s.createdAt || 0, ...(s.history || []).map((h) => h.t), ...(s.worksheets || []).map((w) => w.t));

// Everything about S.A.M worksheets and students sits behind this gate.
export default function Teacher({ storeState, store, teacher, onUnlock, onLock, onSaveVaultData, roster, real, sampleOn, setSampleOn, currentId, setCurrent, downloads }) {
  const { mode, canTeach, vault, seedCatalog } = storeState;
  if (mode === 'starting' || (canTeach && vault === undefined)) {
    return <div className="wrap gate" aria-busy="true"><h1>Teacher sign-in</h1><p>Opening the teacher area.</p></div>;
  }
  if (!canTeach) {
    return (
      <div className="wrap gate">
        <h1>Teacher sign-in</h1>
        <p>This area is for tutors. It holds student records and the S.A.M worksheet links, so it opens only for people the page owner has added as editors, and only with the teacher passcode.</p>
        <p>Students can practice without signing in. <a href="#home">Go to practice</a>.</p>
      </div>
    );
  }
  if (!vault) return <Setup store={store} seedCatalog={seedCatalog} onUnlock={onUnlock} />;
  if (!teacher) return <SignIn vault={vault} store={store} onUnlock={onUnlock} />;
  return (
    <Dashboard storeState={storeState} store={store} teacher={teacher} onLock={onLock} onSaveVaultData={onSaveVaultData}
      roster={roster} real={real} sampleOn={sampleOn} setSampleOn={setSampleOn} currentId={currentId} setCurrent={setCurrent} downloads={downloads} />
  );
}

function PasscodeFields({ pass, setPass, confirm, setConfirm }) {
  return (
    <>
      <div className="fld">
        <label htmlFor="pc1">New teacher passcode</label>
        <input id="pc1" className="input" type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} aria-describedby="pc-help" />
        <span className="help" id="pc-help">At least 10 characters. It cannot be recovered, so keep it with the center's other passwords.</span>
      </div>
      <div className="fld">
        <label htmlFor="pc2">Type it again</label>
        <input id="pc2" className="input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
    </>
  );
}

function Setup({ store, seedCatalog, onUnlock }) {
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [paste, setPaste] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const pasted = useMemo(() => parseCatalogText(paste), [paste]);
  const rows = seedCatalog?.length ? seedCatalog : pasted;

  async function submit(e) {
    e.preventDefault();
    if (pass.length < 10) return setErr('Use at least 10 characters for the passcode.');
    if (pass !== confirm) return setErr('The two passcodes do not match.');
    if (!rows.length) return setErr('Paste the worksheet list first. Each row needs its S/N, topic, subtopic and worksheet name.');
    setErr(null);
    setBusy(true);
    try {
      const data = { catalog: rows, links: {} };
      const { sealed, session } = await createVault(pass, data);
      await store.saveVault(sealed, { dropSeed: true });
      onUnlock(session, data);
    } catch {
      setErr('The teacher area could not be saved. Check the connection and try again.');
      setBusy(false);
    }
  }

  return (
    <div className="wrap gate">
      <h1>Set up teacher access</h1>
      <p>Choose a passcode for the tutors at the center. The worksheet list and its links are encrypted with it before they are saved, so only someone with the passcode can read them.</p>
      <form className="form" onSubmit={submit}>
        <PasscodeFields pass={pass} setPass={setPass} confirm={confirm} setConfirm={setConfirm} />
        {seedCatalog?.length ? (
          <p className="ok-note">The S.A.M Level 5 worksheet list ({seedCatalog.length} worksheets) is ready. It is locked in with this passcode and the plain copy is removed.</p>
        ) : (
          <div className="fld">
            <label htmlFor="paste">Worksheet list</label>
            <textarea id="paste" className="input" value={paste} onChange={(e) => setPaste(e.target.value)} aria-describedby="paste-help" />
            <span className="help" id="paste-help">Copy the worksheet table from the S.A.M portal and paste it here. {pasted.length ? `${pasted.length} worksheets found.` : ''}</span>
          </div>
        )}
        {err ? <p className="err" role="alert">{err}</p> : null}
        <div className="row"><button className="btn btn-primary" type="submit" disabled={busy}><Icon name="lock" size={18} /> {busy ? 'Locking…' : 'Lock and open'}</button></div>
      </form>
    </div>
  );
}

function SignIn({ vault, store, onUnlock }) {
  const [pass, setPass] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reset, setReset] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!pass) return;
    setBusy(true);
    setErr(null);
    try {
      const { data, session } = await openVault(pass, vault);
      onUnlock(session, data);
    } catch {
      setErr('That passcode is not right. Check it and try again.');
      setBusy(false);
    }
  }

  return (
    <div className="wrap gate">
      <h1>Teacher sign-in</h1>
      <p>Enter the teacher passcode to open student records and the S.A.M worksheets.</p>
      <form className="form" onSubmit={submit}>
        <div className="fld">
          <label htmlFor="pc">Teacher passcode</label>
          <input id="pc" className="input" type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} autoFocus aria-describedby={err ? 'pc-err' : undefined} />
        </div>
        {err ? <p className="err" id="pc-err" role="alert">{err}</p> : null}
        <div className="row">
          <button className="btn btn-primary" type="submit" disabled={busy || !pass}><Icon name="unlock" size={18} /> {busy ? 'Checking…' : 'Open'}</button>
          <button className="btn btn-text" type="button" onClick={() => setReset(!reset)}>Forgot the passcode?</button>
        </div>
      </form>
      {reset ? (
        <div className="panel">
          <h2>Start the teacher area over</h2>
          <p>The passcode cannot be recovered. Starting over deletes the encrypted worksheet list and its links. Student records are kept. You will paste the worksheet list again and choose a new passcode.</p>
          <div className="row"><button className="btn btn-danger" type="button" onClick={() => store.resetVault()}>Delete the worksheet list and links</button></div>
        </div>
      ) : null}
    </div>
  );
}

function Dashboard({ storeState, store, teacher, onLock, onSaveVaultData, roster, real, sampleOn, setSampleOn, currentId, setCurrent, downloads }) {
  const catalog = useMemo(() => buildCatalog(teacher.data.catalog), [teacher.data.catalog]);
  const links = teacher.data.links || {};
  const [selId, setSelId] = useState(currentId || roster[0]?.id || null);
  const sel = roster.find((s) => s.id === selId) || roster[0] || null;
  const [msg, setMsg] = useState(null);
  const [backupText, setBackupText] = useState(null);
  const fileRef = useRef(null);
  const classTags = useMemo(() => {
    const t = {};
    for (const s of roster) for (const [k, v] of Object.entries(s.tags || {})) if (k !== 'other') t[k] = (t[k] || 0) + v;
    return Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 7);
  }, [roster]);
  const maxTag = classTags[0]?.[1] || 1;

  async function save(filename, data) {
    if (!downloads) { setBackupText(data); return; }
    try { await downloads.save({ filename, data }); setMsg(`Saved ${filename}.`); } catch (e) { if (e?.code !== 'declined') setBackupText(data); }
  }
  const today = new Date().toISOString().slice(0, 10);
  const exportCsv = () => {
    const head = ['Student', ...SKILLS.map((s) => `${s.name} (%)`), 'Course (%)', 'Most common mistake', 'Steps', 'Worksheets logged'];
    const rows = real.map((s) => [s.name, ...SKILLS.map((k) => (s.skills[k.id] ? Math.round(s.skills[k.id].p * 100) : '')), courseSummary(s).score, topPatterns(s, 1)[0]?.name || '', s.history.length, s.worksheets.length]);
    save(`barwise-report-${today}.csv`, [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n'));
  };
  const exportJson = () => save(`barwise-students-${today}.json`, JSON.stringify(store.exportStudents(), null, 2));
  const importFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { const n = store.importStudents(JSON.parse(String(r.result))); setMsg(`Imported ${n} student${n === 1 ? '' : 's'}.`); } catch (err) { setMsg(`That file could not be imported: ${err.message}`); } };
    r.readAsText(f);
    e.target.value = '';
  };

  return (
    <div className="wrap teacher">
      <div className="teacher-head">
        <div>
          <h1>Teacher</h1>
          <p className="meta">{storeState.mode === 'db' ? 'Saved with this page. Only the owner and editors can read it.' : 'Saved in this browser only. Export a backup to keep it.'}</p>
        </div>
        <div className="row">
          <AddStudent onAdd={(name) => { const id = 's' + Date.now().toString(36); store.saveStudent(emptyStudent(name, id)); setSelId(id); setCurrent(id); }} />
          <button className="btn btn-quiet btn-sm" type="button" onClick={onLock}><Icon name="lock" size={18} /> Lock</button>
        </div>
      </div>

      <div className="row">
        <button className="btn btn-quiet btn-sm" type="button" aria-pressed={sampleOn} onClick={() => setSampleOn(!sampleOn)}><Icon name="eye" size={18} /> {sampleOn ? 'Hide sample class' : 'Show sample class'}</button>
        <button className="btn btn-quiet btn-sm" type="button" onClick={exportCsv} disabled={!real.length}><Icon name="download" size={18} /> Report (CSV)</button>
        <button className="btn btn-quiet btn-sm" type="button" onClick={exportJson} disabled={!real.length}><Icon name="download" size={18} /> Back up students</button>
        <button className="btn btn-quiet btn-sm" type="button" onClick={() => fileRef.current?.click()}><Icon name="upload" size={18} /> Import students</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importFile} />
      </div>
      {msg ? <p className="ok-note" role="status">{msg}</p> : null}
      {storeState.error ? <p className="err" role="alert">{storeState.error}</p> : null}
      {backupText ? (
        <div className="panel">
          <h2>Copy the file contents</h2>
          <p className="sub">Saving files is not available here, so the contents are shown instead.</p>
          <label className="sr-only" htmlFor="backup">File contents</label>
          <textarea id="backup" className="input" readOnly value={backupText} onFocus={(e) => e.target.select()} />
          <div className="row">
            <button className="btn btn-primary btn-sm" type="button" onClick={() => navigator.clipboard?.writeText(backupText).then(() => setMsg('Copied.'), () => document.getElementById('backup')?.select())}>Copy</button>
            <button className="btn btn-text btn-sm" type="button" onClick={() => setBackupText(null)}>Close</button>
          </div>
        </div>
      ) : null}

      {!roster.length ? (
        <div className="empty">
          <h2>Add your first student</h2>
          <p>Each student gets a mastery estimate for all eight skills, a list of the mistakes they repeat, and a next skill with matching S.A.M worksheets. Use a first name or initials. To preview the dashboard, show the sample class.</p>
        </div>
      ) : (
        <>
          <section className="panel" aria-labelledby="cm-h">
            <h2 id="cm-h">Class mastery</h2>
            <p className="sub">Select a student to see their details and practice as them.</p>
            <div className="scroll-x">
              <table className="heat">
                <thead><tr><th>Student</th>{SKILLS.map((s) => <th key={s.id} style={{ textAlign: 'center' }} title={s.name}>{SHORT[s.id]}</th>)}<th className="num">Course</th><th>Last active</th></tr></thead>
                <tbody>
                  {roster.map((s) => (
                    <tr key={s.id} className={sel?.id === s.id ? 'sel' : ''} onClick={() => setSelId(s.id)}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button type="button" className="who" aria-pressed={sel?.id === s.id} onClick={() => setSelId(s.id)}><Avatar name={s.name} id={s.id} /> {s.name}</button>
                        {s.sample ? <span className="tag sample" style={{ marginLeft: 8 }}>Sample</span> : null}
                      </td>
                      {SKILLS.map((k) => <td key={k.id} className="cell"><div className="cb"><MasteryIcon skill={s.skills[k.id]} /><span>{s.skills[k.id] ? Math.round(s.skills[k.id].p * 100) : '-'}</span></div></td>)}
                      <td className="num"><b>{courseSummary(s).score}%</b></td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--ink-2)' }}>{timeAgo(lastActive(s))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="cols">
            {sel ? <StudentPanel key={sel.id} s={sel} store={store} catalog={catalog} links={links} onDeleted={() => setSelId(null)} setCurrent={setCurrent} currentId={currentId} /> : <div />}
            <div className="stack">
              <section className="panel" aria-labelledby="cp-h">
                <h2 id="cp-h">Mistakes across the class</h2>
                <p className="sub">Wrong answers matched to a known slip, all students together.</p>
                {classTags.length ? (
                  <div className="hbars">
                    {classTags.map(([t, v]) => (
                      <div className="hb" key={t}><span>{MISCONCEPTIONS[t].name}</span><span className="n">{v}</span><div className="fill" style={{ width: `${(v / maxTag) * 100}%` }} /></div>
                    ))}
                  </div>
                ) : <p className="mini">None yet. They appear as students practice.</p>}
              </section>
              <section className="panel" aria-labelledby="ns-h">
                <h2 id="ns-h">Next for each student</h2>
                {roster.map((s) => {
                  const r = recommend(s);
                  return (
                    <div key={s.id} style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: 12 }}>
                      <Avatar name={s.name} id={s.id} />
                      <div><b>{s.name}</b>: {r.skillId ? SKILL[r.skillId].name : 'Mixed review'}<p className="mini">{r.reason}</p></div>
                    </div>
                  );
                })}
              </section>
            </div>
          </div>
        </>
      )}

      <Catalog catalog={catalog} links={links} onSaveLinks={(next) => onSaveVaultData({ ...teacher.data, links: next })} />
      <ChangePasscode teacher={teacher} store={store} onUnlock={(session, data) => onSaveVaultData(data, session)} />
    </div>
  );
}

function AddStudent({ onAdd }) {
  const [name, setName] = useState('');
  return (
    <form className="row" onSubmit={(e) => { e.preventDefault(); const n = name.trim(); if (n) { onAdd(n); setName(''); } }}>
      <label className="sr-only" htmlFor="add-student">Student first name or initials</label>
      <input id="add-student" className="input" style={{ width: 220, minHeight: 38 }} placeholder="First name or initials…" autoComplete="off" spellCheck={false} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
      <button className="btn btn-primary btn-sm" type="submit" disabled={!name.trim()}><Icon name="plus" size={18} /> Add student</button>
    </form>
  );
}

function StudentPanel({ s, store, catalog, links, onDeleted, setCurrent, currentId }) {
  const pats = topPatterns(s, 3);
  const reco = recommend(s);
  const sheets = reco.skillId ? worksheetsForSkill(catalog, reco.skillId) : [];
  const [confirm, setConfirm] = useState(false);
  const problems = useMemo(() => {
    const out = [];
    for (const h of s.history.slice().reverse()) {
      const last = out[out.length - 1];
      if (last && last.problem === h.problem) { last.steps.push(h); continue; }
      if (out.length >= 6) break;
      out.push({ problem: h.problem, skill: h.skill, t: h.t, steps: [h] });
    }
    return out;
  }, [s]);

  return (
    <section className="panel" aria-label={`${s.name} details`}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="row"><Avatar name={s.name} id={s.id} /><h2>{s.name}</h2></div>
        {s.sample ? <span className="tag sample">Sample, not saved</span> : (
          <div className="row">
            {currentId === s.id ? <span className="tag blue">Practicing now</span> : <button className="btn btn-quiet btn-sm" type="button" onClick={() => setCurrent(s.id)}>Practice as {s.name}</button>}
            {confirm ? (
              <>
                <button className="btn btn-danger btn-sm" type="button" onClick={() => { store.deleteStudent(s.id); onDeleted(); }}>Delete for good</button>
                <button className="btn btn-text btn-sm" type="button" onClick={() => setConfirm(false)}>Keep</button>
              </>
            ) : <button className="btn btn-text btn-sm btn-icon" type="button" aria-label={`Delete ${s.name}`} onClick={() => setConfirm(true)}><Icon name="trash" size={18} /></button>}
          </div>
        )}
      </div>

      <div>
        {SKILLS.map((k) => {
          const sk = s.skills[k.id];
          const lv = levelOf(sk);
          return (
            <div className="skill-line" key={k.id}>
              <MasteryIcon skill={sk} />
              <div>
                <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}><span>{k.name}</span><span className="mini">{LEVELS.find((l) => l.id === lv).name}{sk ? `, ${sk.c} of ${sk.n} right` : ''}</span></div>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${(sk?.p || 0) * 100}%`, background: FILL[lv] }} /></div>
              </div>
              <span className="pc">{sk ? Math.round(sk.p * 100) + '%' : '-'}</span>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <h3 style={{ fontSize: 18 }}>Mistakes {s.name} repeats</h3>
        {pats.length ? pats.map((p) => (
          <div className="pattern" key={p.tag}><b>{p.name}{p.n > 1 ? `, ${p.n} times` : ''}</b><p>Try this: {p.tutor}</p></div>
        )) : <p className="mini">None yet.</p>}
      </div>

      {reco.skillId ? (
        <div className="next" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 20 }}>Next: {SKILL[reco.skillId].name}</h3>
          <p>{reco.reason}</p>
          {sheets.length ? (
            <div className="ws">
              {sheets.map((w) => links[w.name]
                ? <a key={w.sn} className="tag blue" href={links[w.name]} target="_blank" rel="noreferrer">{w.name} <Icon name="external" size={14} /></a>
                : <span key={w.sn} className="tag">{w.name}</span>)}
            </div>
          ) : null}
        </div>
      ) : null}

      {!s.sample ? <LogWorksheet s={s} store={store} catalog={catalog} /> : null}

      <div style={{ display: 'grid', gap: 8 }}>
        <h3 style={{ fontSize: 18 }}>Recent work</h3>
        {problems.length || s.worksheets.length ? (
          <ul className="activity">
            {s.worksheets.slice(0, 3).map((w) => (
              <li key={'w' + w.t}><Icon name="check" size={16} className="ok" /><span>Paper worksheet {w.name}: {w.correct} of {w.total}{w.tags?.length ? `. ${w.tags.map((t) => MISCONCEPTIONS[t]?.name).join(', ')}` : ''}</span><time>{timeAgo(w.t)}</time></li>
            ))}
            {problems.map((p) => {
              const ok = p.steps.filter((h) => h.ok).length;
              const tagged = p.steps.find((h) => h.tag);
              return (
                <li key={p.problem + p.t}>
                  <Icon name={ok === p.steps.length ? 'check' : 'x'} size={16} className={ok === p.steps.length ? 'ok' : 'no'} />
                  <span>{SKILL[p.skill]?.name}: {ok} of {p.steps.length} steps right first time{tagged ? `. ${MISCONCEPTIONS[tagged.tag].name}` : ''}</span>
                  <time>{timeAgo(p.t)}</time>
                </li>
              );
            })}
          </ul>
        ) : <p className="mini">No practice yet. Choose “Practice as {s.name}” and open a skill from the home page.</p>}
      </div>
    </section>
  );
}

function LogWorksheet({ s, store, catalog }) {
  const [q, setQ] = useState('');
  const [sn, setSn] = useState('');
  const [correct, setCorrect] = useState('');
  const [total, setTotal] = useState('');
  const [tags, setTags] = useState([]);
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(null);
  const options = catalog.filter((r) => !r.usa && (!q || `${r.name} ${r.topic} ${r.sub}`.toLowerCase().includes(q.toLowerCase())));

  function submit(e) {
    e.preventDefault();
    const row = catalog.find((r) => String(r.sn) === sn);
    const c = Number(correct);
    const t = Number(total);
    if (!row) return setErr('Choose the worksheet you marked.');
    if (!Number.isInteger(t) || t < 1) return setErr('Enter how many questions the worksheet has.');
    if (!Number.isInteger(c) || c < 0 || c > t) return setErr('Questions right must be a whole number from 0 to the total.');
    setErr(null);
    store.saveStudent(recordWorksheet(s, { sn: row.sn, name: row.name, topic: row.topic, skills: row.skills, correct: c, total: t, tags }));
    setDone(`Logged ${row.name} for ${s.name}.`);
    setCorrect(''); setTotal(''); setTags([]);
  }

  return (
    <form className="log" onSubmit={submit} aria-labelledby={`log-${s.id}`}>
      <h3 className="full" id={`log-${s.id}`} style={{ fontSize: 18 }}>Log a marked worksheet</h3>
      <div className="fld full"><label htmlFor="ws-q">Find the worksheet</label><input id="ws-q" className="input" placeholder="Code or topic, like 05.13 or rate…" autoComplete="off" spellCheck={false} value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="fld full">
        <label htmlFor="ws-sn">Worksheet</label>
        <select id="ws-sn" className="input" value={sn} onChange={(e) => setSn(e.target.value)}>
          <option value="">Choose from {options.length}</option>
          {options.map((r) => <option key={r.sn} value={r.sn}>{r.name}, {r.sub}</option>)}
        </select>
      </div>
      <div className="fld"><label htmlFor="ws-c">Questions right</label><input id="ws-c" className="input" inputMode="numeric" value={correct} onChange={(e) => setCorrect(e.target.value)} /></div>
      <div className="fld"><label htmlFor="ws-t">Questions in total</label><input id="ws-t" className="input" inputMode="numeric" value={total} onChange={(e) => setTotal(e.target.value)} /></div>
      <div className="fld full">
        <span className="lab" id="ws-tags">Mistakes you saw</span>
        <div className="picks" role="group" aria-labelledby="ws-tags">
          {TAGS.filter((t) => t !== 'other').map((t) => (
            <button key={t} type="button" aria-pressed={tags.includes(t)} onClick={() => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])}>{MISCONCEPTIONS[t].name}</button>
          ))}
        </div>
      </div>
      {err ? <p className="err full" role="alert">{err}</p> : null}
      {done ? <p className="ok-note full" role="status">{done}</p> : null}
      <div className="full"><button className="btn btn-primary btn-sm" type="submit">Log worksheet</button></div>
    </form>
  );
}

function Catalog({ catalog, links, onSaveLinks }) {
  const [q, setQ] = useState('');
  const [usa, setUsa] = useState(false);
  const [editing, setEditing] = useState(null);
  const [url, setUrl] = useState('');
  const [err, setErr] = useState(null);
  const [bulk, setBulk] = useState(null);
  const [note, setNote] = useState(null);
  const rows = catalog.filter((r) => r.usa === usa && (!q || `${r.name} ${r.sub} ${r.topic}`.toLowerCase().includes(q.toLowerCase())));
  const linked = Object.keys(links).length;

  async function saveLink(name) {
    const v = url.trim();
    if (v && !/^https:\/\//i.test(v)) return setErr('Links must start with https://');
    const next = { ...links };
    if (v) next[name] = v; else delete next[name];
    await onSaveLinks(next);
    setEditing(null);
    setErr(null);
  }

  // Lines like "05.06 SWP 1-2 WS<tab>https://…", from a spreadsheet or the
  // browser-console script in the README.
  async function saveBulk() {
    const norm = (x) => x.toLowerCase().replace(/\s+/g, ' ').trim();
    const byName = new Map(catalog.map((r) => [norm(r.name), r.name]));
    const next = { ...links };
    let matched = 0;
    const missed = [];
    for (const line of (bulk || '').split(/\r?\n/)) {
      const m = line.match(/^(.*?)[\t,;|]+\s*(https:\/\/\S+)\s*$/i);
      if (!m) continue;
      const name = byName.get(norm(m[1].replace(/^"|"$/g, '')));
      if (name) { next[name] = m[2]; matched++; } else missed.push(m[1].trim());
    }
    if (!matched) return setNote('No lines matched. Each line needs a worksheet name, then a tab or comma, then an https:// link.');
    await onSaveLinks(next);
    setNote(`Linked ${matched} worksheet${matched === 1 ? '' : 's'}.${missed.length ? ` ${missed.length} did not match a worksheet name, like ${missed[0]}.` : ''}`);
    setBulk(null);
  }

  return (
    <section className="panel" aria-labelledby="cat-h">
      <h2 id="cat-h">S.A.M Level 5 worksheets</h2>
      <p className="sub">{catalog.length} worksheets, {linked} linked. Practice skills are matched from topic names. Term Review and Mastering Heuristics sheets are matched by term, so check them against the sheets.</p>
      <div className="row">
        <label className="sr-only" htmlFor="cat-q">Search worksheets</label>
        <input id="cat-q" className="input" style={{ maxWidth: 300 }} placeholder="Search worksheets…" autoComplete="off" spellCheck={false} value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn btn-quiet btn-sm" type="button" aria-pressed={usa} onClick={() => setUsa(!usa)}>{usa ? 'Show standard versions' : 'Show USA versions'}</button>
        <button className="btn btn-quiet btn-sm" type="button" onClick={() => { setBulk(bulk == null ? '' : null); setNote(null); }}><Icon name="link" size={18} /> Paste many links</button>
      </div>
      {bulk != null ? (
        <div className="fld">
          <label htmlFor="bulk">One worksheet per line: its name, a tab or comma, then its link</label>
          <textarea id="bulk" className="input" value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={'Worksheet name\thttps://…'} />
          <div className="row"><button className="btn btn-primary btn-sm" type="button" onClick={saveBulk} disabled={!bulk.trim()}>Link worksheets</button><button className="btn btn-text btn-sm" type="button" onClick={() => setBulk(null)}>Cancel</button></div>
        </div>
      ) : null}
      {note ? <p className="ok-note" role="status">{note}</p> : null}
      {err ? <p className="err" role="alert">{err}</p> : null}
      <div className="scroll-x" style={{ maxHeight: 560, overflowY: 'auto' }}>
        <table>
          <thead><tr><th className="num">S/N</th><th>Worksheet</th><th>Topic</th><th>Practice skills</th><th>Link</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.sn}>
                <td className="num">{r.sn}</td>
                <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{r.name}</td>
                <td><div>{r.sub}</div><div className="mini">{r.topic}</div></td>
                <td><div className="ws">{r.skills.length ? r.skills.map((id) => <a key={id} className="tag" href={`#practice-${id}`}>{SHORT[id]}</a>) : <span className="mini">None</span>}{r.byTerm && r.skills.length ? <span className="tag sample">by term</span> : null}</div></td>
                <td style={{ minWidth: 190 }}>
                  {editing === r.name ? (
                    <form className="row" onSubmit={(e) => { e.preventDefault(); saveLink(r.name); }}>
                      <label className="sr-only" htmlFor={`url-${r.sn}`}>Link for {r.name}</label>
                      <input id={`url-${r.sn}`} className="input" style={{ minHeight: 38, width: 210 }} placeholder="https://…" autoComplete="off" spellCheck={false} value={url} onChange={(e) => setUrl(e.target.value)} autoFocus />
                      <button className="btn btn-primary btn-sm" type="submit">Save</button>
                      <button className="btn btn-text btn-sm" type="button" onClick={() => { setEditing(null); setErr(null); }}>Cancel</button>
                    </form>
                  ) : links[r.name] ? (
                    <span className="row"><a className="tag blue" href={links[r.name]} target="_blank" rel="noreferrer">Open <Icon name="external" size={14} /></a><button className="btn btn-text btn-sm" type="button" onClick={() => { setEditing(r.name); setUrl(links[r.name]); }}>Edit</button></span>
                  ) : (
                    <button className="btn btn-text btn-sm" type="button" onClick={() => { setEditing(r.name); setUrl(''); }}><Icon name="link" size={16} /> Add link</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ChangePasscode({ teacher, store, onUnlock }) {
  const [open, setOpen] = useState(false);
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(false);
  async function submit(e) {
    e.preventDefault();
    if (pass.length < 10) return setErr('Use at least 10 characters for the passcode.');
    if (pass !== confirm) return setErr('The two passcodes do not match.');
    setErr(null);
    const { sealed, session } = await createVault(pass, teacher.data);
    await store.saveVault(sealed);
    onUnlock(session, teacher.data);
    setDone(true); setOpen(false); setPass(''); setConfirm('');
  }
  return (
    <section className="panel" aria-labelledby="pc-h">
      <h2 id="pc-h">Teacher passcode</h2>
      <p className="sub">Change it when a tutor leaves the center. Everyone else then signs in with the new one.</p>
      {done ? <p className="ok-note" role="status">Passcode changed.</p> : null}
      {open ? (
        <form className="form" style={{ maxWidth: 420 }} onSubmit={submit}>
          <PasscodeFields pass={pass} setPass={setPass} confirm={confirm} setConfirm={setConfirm} />
          {err ? <p className="err" role="alert">{err}</p> : null}
          <div className="row"><button className="btn btn-primary btn-sm" type="submit">Change passcode</button><button className="btn btn-text btn-sm" type="button" onClick={() => setOpen(false)}>Cancel</button></div>
        </form>
      ) : <div className="row"><button className="btn btn-quiet btn-sm" type="button" onClick={() => { setOpen(true); setDone(false); }}><Icon name="key" size={18} /> Change passcode</button></div>}
    </section>
  );
}
