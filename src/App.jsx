import React, { useEffect, useMemo, useRef, useState } from 'react';
import Home, { Footer } from './components/Home.jsx';
import Practice from './components/Practice.jsx';
import Builder from './components/Builder.jsx';
import Teacher from './components/Teacher.jsx';
import About from './components/About.jsx';
import { Avatar, Icon } from './components/ui.jsx';
import { createStore } from './store/store.js';
import { resealVault, openWithKey, saltOf } from './store/vault.js';
import { buildCatalog } from './data/catalog.js';
import { SKILL, SKILLS, makeProblem } from './engine/skills.js';
import { recordStep, emptyStudent } from './engine/model.js';
import { buildSampleClass } from './sample.js';

const PREF = 'barwise:prefs';
const readPrefs = () => { try { return JSON.parse(localStorage.getItem(PREF)) || {}; } catch { return {}; } };
const writePrefs = (p) => { try { localStorage.setItem(PREF, JSON.stringify(p)); } catch { /* unavailable */ } };

function parseHash() {
  const h = (window.location.hash || '').replace(/^#/, '');
  const [view, ...rest] = h.split('-');
  const arg = rest.join('-');
  if (view === 'practice' && (SKILL[arg] || arg === 'mix' || arg === 'custom')) return { view, arg };
  if (view === 'builder') return { view, arg: SKILL[arg] ? arg : 'cmp' };
  if (view === 'teacher' || view === 'about') return { view };
  return { view: 'home' };
}

export default function App() {
  const store = useRef(null);
  if (!store.current) store.current = createStore();
  const [storeState, setStoreState] = useState({ mode: 'starting', students: {}, vault: undefined });
  const [route, setRoute] = useState(parseHash);
  const [prefs, setPrefs] = useState(readPrefs);
  const [teacher, setTeacher] = useState(null); // { session, data } while unlocked, in memory only
  const [sampleOn, setSampleOn] = useState(false);
  const [guest, setGuest] = useState(() => ({ ...emptyStudent('Guest', 'guest'), guest: true }));
  const [customPlan, setCustomPlan] = useState(null);
  const [downloads, setDownloads] = useState(null);
  const [planKey, setPlanKey] = useState(0);

  useEffect(() => {
    const unsub = store.current.subscribe(setStoreState);
    store.current.start();
    window.claude?.use?.('downloads').then((d) => setDownloads(d || null), () => {});
    return unsub;
  }, []);
  useEffect(() => {
    const on = () => { setRoute(parseHash()); setPlanKey((k) => k + 1); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  // The vault changed elsewhere: re-read it with our key, or lock if the passcode changed.
  useEffect(() => {
    const v = storeState.vault;
    if (!teacher) return;
    if (!v || v.salt !== saltOf(teacher.session)) { setTeacher(null); return; }
    openWithKey(teacher.session, v).then((data) => setTeacher((t) => (t ? { ...t, data } : t)), () => setTeacher(null));
  }, [storeState.vault]); // eslint-disable-line react-hooks/exhaustive-deps

  const sample = useMemo(() => (teacher && sampleOn ? buildSampleClass() : []), [teacher, sampleOn]);
  const real = useMemo(() => (teacher ? Object.values(storeState.students).sort((a, b) => a.createdAt - b.createdAt) : []), [teacher, storeState.students]);
  const roster = useMemo(() => [...real, ...sample], [real, sample]);
  const currentId = teacher && prefs.current && roster.some((s) => s.id === prefs.current) ? prefs.current : null;
  const student = roster.find((s) => s.id === currentId) || null;
  const setCurrent = (id) => { const p = { ...prefs, current: id }; setPrefs(p); writePrefs(p); };
  const teacherView = useMemo(() => (teacher ? { catalog: buildCatalog(teacher.data.catalog || []), links: teacher.data.links || {} } : null), [teacher]);

  function onRecord(obs) {
    if (student && !student.sample) store.current.saveStudent(recordStep(student, obs));
    else if (!student) setGuest((g) => ({ ...recordStep(g, obs), guest: true }));
  }

  async function onSaveVaultData(data, session = teacher.session) {
    const sealed = await resealVault(session, data);
    setTeacher({ session, data });
    await store.current.saveVault(sealed);
  }

  const plan = useMemo(() => {
    if (route.view !== 'practice') return null;
    if (route.arg === 'custom') return customPlan;
    if (route.arg === 'mix') {
      const base = student || guest;
      const ranked = SKILLS.filter((s) => base.skills[s.id]).sort((a, b) => base.skills[a.id].p - base.skills[b.id].p).slice(0, 3);
      const ids = ranked.length ? ranked.map((s) => s.id) : ['pw', 'cmp', 'frac'];
      return { title: 'Mixed review', skills: Array.from({ length: 5 }, (_, i) => ids[i % ids.length]), key: planKey };
    }
    return { title: SKILL[route.arg].name, skills: Array(5).fill(route.arg), key: planKey };
  }, [route, customPlan, planKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function practiceProblem(problem) {
    const rest = Array.from({ length: 4 }, () => makeProblem(problem.skillId));
    setCustomPlan({ title: SKILL[problem.skillId].name, problems: [problem, ...rest], key: Date.now() });
    window.location.hash = 'practice-custom';
  }

  const nav = [
    ['home', 'Practice', '#home', 'Practice'],
    ['builder', 'Model builder', `#builder-${route.view === 'builder' ? route.arg : 'cmp'}`, 'Builder'],
    ['about', 'How it works', '#about', 'About'],
  ];
  const active = route.view === 'practice' ? 'home' : route.view;

  return (
    <>
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
      <header className="bar">
        <div className="wrap bar-in">
          <a className="word" href="#home">Barwise</a>
          <nav className="links" aria-label="Main">
            {nav.map(([id, label, href, short]) => (
              <a key={id} href={href} aria-label={label} aria-current={active === id ? 'page' : undefined}>
                <span className="long">{label}</span><span className="short" aria-hidden="true">{short}</span>
              </a>
            ))}
          </nav>
          <div className="bar-tools">
            {teacher ? <StudentMenu roster={roster} current={student} onPick={setCurrent} /> : (
              <a className="btn btn-quiet btn-sm" href="#teacher" aria-label="Teacher sign-in" aria-current={route.view === 'teacher' ? 'page' : undefined}><Icon name="lock" size={18} /> <span className="tl">Teacher sign-in</span></a>
            )}
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} style={{ outline: 'none' }}>
        {route.view === 'home' || (route.view === 'practice' && !plan) ? <Home student={student} onRecord={onRecord} teacherHref="#teacher" /> : null}
        {route.view === 'practice' && plan ? (
          <Practice key={`${route.arg}-${plan.key}-${currentId}`} plan={plan} student={student || guest} onRecord={onRecord}
            onExit={() => { window.location.hash = 'home'; }} teacher={teacherView} />
        ) : null}
        {route.view === 'builder' ? <Builder key={route.arg} skillId={route.arg} student={student} onPractice={practiceProblem} /> : null}
        {route.view === 'teacher' ? (
          <Teacher storeState={storeState} store={store.current} teacher={teacher}
            onUnlock={(session, data) => setTeacher({ session, data })} onLock={() => { setTeacher(null); setSampleOn(false); }}
            onSaveVaultData={onSaveVaultData} roster={roster} real={real} sampleOn={sampleOn} setSampleOn={setSampleOn}
            currentId={currentId} setCurrent={setCurrent} downloads={downloads} />
        ) : null}
        {route.view === 'about' ? <About /> : null}
      </main>
      {route.view !== 'practice' ? <Footer teacherHref="#teacher" /> : null}
    </>
  );
}

function StudentMenu({ roster, current, onPick }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  const name = current ? current.name : 'Guest';
  return (
    <div className="menu-wrap" ref={ref}>
      <button className="menu-btn" type="button" aria-label={`Practicing as ${name}`} aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Avatar name={name} id={current?.id || 'guest'} /><span className="nm">{name}</span><Icon name="chevron" size={16} />
      </button>
      {open ? (
        <div className="menu" role="menu">
          <p className="cap">Who is practicing on this device?</p>
          <button className="item" role="menuitemradio" aria-checked={!current} type="button" onClick={() => { onPick(null); setOpen(false); }}>
            <Avatar name="Guest" id="guest" /> Guest, not saved
          </button>
          {roster.map((s) => (
            <button key={s.id} className="item" role="menuitemradio" aria-checked={current?.id === s.id} type="button" onClick={() => { onPick(s.id); setOpen(false); }}>
              <Avatar name={s.name} id={s.id} /> {s.name}
            </button>
          ))}
          <a className="item" role="menuitem" href="#teacher" onClick={() => setOpen(false)} style={{ color: 'var(--blue)', textDecoration: 'none' }}><Icon name="unlock" size={18} /> Teacher area</a>
        </div>
      ) : null}
    </div>
  );
}
