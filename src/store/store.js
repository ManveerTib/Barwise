// Where data lives.
//  Published as a claude.ai artifact: the artifact's shared `db`, whose rules
//  let only the owner and editors (teachers) read or write anything.
//    students/<id>    one document per student
//    teacher/vault    the encrypted worksheet list and links (see vault.js)
//    teacher/catalog  a one-time plain copy of the worksheet list, folded into
//                     the vault and deleted when a teacher first sets a passcode
//  Anywhere else (local dev, a saved copy): this browser's localStorage.

const LOCAL_KEY = 'barwise:v2';

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY)) || {};
  } catch {
    return {};
  }
}
function writeLocal(state) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable: changes last for this visit only */
  }
}

export function createStore() {
  const listeners = new Set();
  const state = {
    mode: 'starting', // starting | db | local
    canTeach: false, // may this viewer read and write teacher data at all?
    students: {},
    vault: undefined, // undefined = still loading, null = not set up
    seedCatalog: null,
    error: null,
  };
  let db = null;
  const pending = new Map();
  const timers = new Map();
  const inflight = new Map();

  const emit = () => {
    const snap = { ...state, students: { ...state.students } };
    listeners.forEach((fn) => fn(snap));
  };
  const persistLocal = () => writeLocal({ students: state.students, vault: state.vault, seedCatalog: state.seedCatalog });

  function useLocal(reason) {
    const saved = readLocal();
    state.students = saved.students || {};
    state.vault = saved.vault || null;
    state.seedCatalog = saved.seedCatalog || null;
    state.mode = 'local';
    state.canTeach = true;
    state.error = reason || null;
    emit();
  }

  async function start() {
    const claude = typeof window !== 'undefined' ? window.claude : undefined;
    if (!claude || typeof claude.use !== 'function') return useLocal();
    let ns = null;
    let user = null;
    try {
      [ns, user] = await Promise.all([claude.use('db'), claude.use('user')]);
    } catch {
      ns = null;
    }
    if (!ns) {
      // A viewer without the store (signed out, or view-only): practice still
      // works as a guest, and teacher pages explain how to get access.
      state.mode = 'none';
      state.canTeach = false;
      state.vault = null;
      emit();
      return;
    }
    db = ns;
    state.mode = 'db';
    let canEdit = null;
    try {
      canEdit = user ? await user.canEdit() : null;
    } catch {
      canEdit = null;
    }
    state.canTeach = canEdit !== false;
    emit();
    if (!state.canTeach) {
      state.vault = null;
      emit();
      return;
    }
    db.collection('students').onSnapshot(
      (snap) => {
        const next = {};
        for (const d of snap.docs) if (d.exists) next[d.id] = pending.get(d.id) || d.data();
        for (const [id, s] of pending) if (!s.__deleted) next[id] = s;
        state.students = next;
        emit();
      },
      () => {
        state.error = 'Student records stopped syncing. Reload the page to reconnect.';
        emit();
      }
    );
    db.doc('teacher/vault').onSnapshot(
      (d) => {
        state.vault = d.exists ? d.data() : null;
        emit();
      },
      () => {}
    );
    try {
      const seed = await db.doc('teacher/catalog').get();
      state.seedCatalog = seed.exists ? seed.data().rows || null : null;
      emit();
    } catch {
      /* no seed: the teacher pastes the list during setup */
    }
  }

  async function flush(id) {
    if (inflight.get(id)) return;
    const body = pending.get(id);
    if (!body) return;
    inflight.set(id, true);
    try {
      if (body.__deleted) await db.doc('students/' + id).delete();
      else await db.doc('students/' + id).set(JSON.parse(JSON.stringify(body)));
      if (pending.get(id) === body) pending.delete(id);
    } catch (e) {
      state.error = e && e.code === 'quota_exceeded'
        ? 'The store is full. Export a backup and delete old students.'
        : 'A change did not save. It will try again with the next change.';
      emit();
    } finally {
      inflight.set(id, false);
      if (pending.has(id) && pending.get(id) !== body) flush(id);
    }
  }

  function saveStudent(student) {
    state.students = { ...state.students, [student.id]: student };
    emit();
    if (state.mode === 'db') {
      pending.set(student.id, student);
      clearTimeout(timers.get(student.id));
      timers.set(student.id, setTimeout(() => flush(student.id), 700));
    } else if (state.mode === 'local') persistLocal();
  }

  function deleteStudent(id) {
    const next = { ...state.students };
    delete next[id];
    state.students = next;
    emit();
    if (state.mode === 'db') {
      pending.set(id, { __deleted: true });
      clearTimeout(timers.get(id));
      flush(id);
    } else if (state.mode === 'local') persistLocal();
  }

  async function saveVault(sealed, { dropSeed = false } = {}) {
    state.vault = sealed;
    emit();
    if (state.mode === 'db') {
      await db.doc('teacher/vault').set(sealed);
      if (dropSeed && state.seedCatalog) {
        try {
          await db.doc('teacher/catalog').delete();
        } catch {
          /* harmless: the vault already holds the list */
        }
        state.seedCatalog = null;
        emit();
      }
    } else if (state.mode === 'local') {
      if (dropSeed) state.seedCatalog = null;
      persistLocal();
    }
  }

  async function resetVault() {
    state.vault = null;
    emit();
    if (state.mode === 'db') await db.doc('teacher/vault').delete();
    else if (state.mode === 'local') persistLocal();
  }

  function importStudents(data) {
    const students = data && data.students && typeof data.students === 'object' ? data.students : null;
    if (!students) throw new Error('This file has no students in it.');
    let n = 0;
    for (const s of Object.values(students)) {
      if (!s || !s.id || !s.name) continue;
      saveStudent(s);
      n++;
    }
    return n;
  }

  return {
    start,
    subscribe(fn) {
      listeners.add(fn);
      fn({ ...state });
      return () => listeners.delete(fn);
    },
    saveStudent,
    deleteStudent,
    saveVault,
    resetVault,
    importStudents,
    exportStudents: () => ({ app: 'barwise', version: 2, exportedAt: new Date().toISOString(), students: state.students }),
  };
}
