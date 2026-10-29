// Teacher vault: the S.A.M worksheet list and file links, encrypted with the
// teacher passcode before they are stored. The passcode never leaves the
// browser and is never saved; only the encrypted copy is.
//   key  = PBKDF2-SHA256(passcode, random 16-byte salt, 310,000 rounds)
//   data = AES-256-GCM(key, random 12-byte IV, JSON)
// A wrong passcode fails GCM's integrity check, so nothing readable comes out.

const enc = new TextEncoder();
const dec = new TextDecoder();
const ROUNDS = 310000;

const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(passcode, salt, rounds) {
  const base = await crypto.subtle.importKey('raw', enc.encode(passcode), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: rounds, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function seal(data, key, salt, rounds) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(data)));
  return { v: 1, kdf: 'PBKDF2-SHA256', rounds, salt: toB64(salt), iv: toB64(iv), ct: toB64(ct), updatedAt: Date.now() };
}

// Create a new vault. Returns { sealed, session } where session can re-seal later.
export async function createVault(passcode, data) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(passcode, salt, ROUNDS);
  const sealed = await seal(data, key, salt, ROUNDS);
  return { sealed, session: { key, salt, rounds: ROUNDS } };
}

// Open a stored vault. Throws Error('wrong-passcode') when the passcode is wrong.
export async function openVault(passcode, sealed) {
  const salt = fromB64(sealed.salt);
  const key = await deriveKey(passcode, salt, sealed.rounds);
  try {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(sealed.iv) }, key, fromB64(sealed.ct));
    return { data: JSON.parse(dec.decode(pt)), session: { key, salt, rounds: sealed.rounds } };
  } catch {
    throw new Error('wrong-passcode');
  }
}

export async function resealVault(session, data) {
  return seal(data, session.key, session.salt, session.rounds);
}

// Re-read a vault that changed elsewhere, with the key from an open session.
export async function openWithKey(session, sealed) {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(sealed.iv) }, session.key, fromB64(sealed.ct));
  return JSON.parse(dec.decode(pt));
}

export const saltOf = (session) => toB64(session.salt);
